import type { PassportData } from '../types/passport'
import {
  detectMachineReadableDocumentType,
  MACHINE_READABLE_DOCUMENT_TYPE,
} from './mrz.service'
import { PASSPORT_SCAN_ERROR, PassportScanError } from './passportScanError'

/** Strip diacritics so e.g. Í and İ both normalise to I before comparison. */
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const PASSPORT_HEADINGS: ReadonlyArray<RegExp | string> = [
  /\bPASSPORT\b/i,
  /\bPASAPORT\b/i,         // Turkish
  /\bPASSAPORTO\b/i,       // Italian / Portuguese
  /PASSEPORT/i,
  /\bREPUBLIC\s+OF\b/i,    // "Republic of India", "Republic of Turkey", etc.
  'CUMHURIYETI',           // Turkish full heading — compared after diacritic stripping
  /भारत/,                  // Devanagari script — India
  /护照/,
  /旅券/,
  /HỘ CHIẾU/i,
]
const VISA_HEADING = /\b(?:ENTRY\s+VISA|VISA)\b/i
const MINIMUM_PASSPORT_SIGNALS = 2

function rejectNotPassport(): never {
  throw new PassportScanError(PASSPORT_SCAN_ERROR.NOT_PASSPORT)
}

function headingMatches(heading: RegExp | string, rawText: string): boolean {
  if (typeof heading === 'string') {
    return stripDiacritics(rawText).toUpperCase().includes(heading)
  }
  return heading.test(rawText)
}

function countPassportSignals(
  rawText: string,
  visualData: Partial<PassportData>,
): number {
  const headingCount = PASSPORT_HEADINGS.filter((heading) => headingMatches(heading, rawText)).length
  const fieldCount = [
    visualData.passportNumber,
    visualData.surname,
    visualData.nationality,
  ].filter(Boolean).length
  return headingCount + fieldCount
}

/**
 * Reads the 3-letter ICAO country code from the MRZ name line (positions 2–4).
 * When the MRZ nationality field is corrupted (e.g. OCR misread), this value
 * from the name line is more reliable and should be used instead.
 */
export function correctedNationality(
  mrzNameLine: string,
  mrzNationality: string,
): string {
  // MRZ name line format: P<XXX<surname<<givenname…
  // positions 0-1: document code (P<), positions 2-4: country code
  const nameLineCountry = mrzNameLine.slice(2, 5).replace(/<+/g, '')
  if (/^[A-Z]{3}$/.test(nameLineCountry) && nameLineCountry !== mrzNationality) {
    return nameLineCountry
  }
  return mrzNationality
}

export function assertPassportDocument(
  rawText: string,
  hasTd3Mrz: boolean,
  visualData: Partial<PassportData>,
): void {
  const type = detectMachineReadableDocumentType(rawText)
  const rejectedType = type === MACHINE_READABLE_DOCUMENT_TYPE.VISA ||
    type === MACHINE_READABLE_DOCUMENT_TYPE.OTHER

  if (rejectedType || VISA_HEADING.test(rawText)) rejectNotPassport()

  // A recognised PASSPORT MRZ is conclusive proof of document type — no need
  // to also count heading/field signals. This handles low-quality scans where
  // the header zone is unreadable but the MRZ characters are still visible.
  const mrzConfirmsPassport = type === MACHINE_READABLE_DOCUMENT_TYPE.PASSPORT

  if (!hasTd3Mrz && !mrzConfirmsPassport &&
      countPassportSignals(rawText, visualData) < MINIMUM_PASSPORT_SIGNALS) {
    rejectNotPassport()
  }
}
