import type { PassportData } from '../types/passport'
import {
  detectMachineReadableDocumentType,
  MACHINE_READABLE_DOCUMENT_TYPE,
} from './mrz.service'
import { PASSPORT_SCAN_ERROR, PassportScanError } from './passportScanError'

const PASSPORT_HEADINGS = [
  /\bPASSPORT\b/i,
  /PASSEPORT/i,
  /PASAPORT/i,
  /护照/,
  /旅券/,
  /HỘ CHIẾU/i,
]
const VISA_HEADING = /\b(?:ENTRY\s+VISA|VISA)\b/i
const MINIMUM_PASSPORT_SIGNALS = 2

function rejectNotPassport(): never {
  throw new PassportScanError(PASSPORT_SCAN_ERROR.NOT_PASSPORT)
}

function countPassportSignals(
  rawText: string,
  visualData: Partial<PassportData>,
): number {
  const headingCount = PASSPORT_HEADINGS.filter((heading) => heading.test(rawText)).length
  const fieldCount = [
    visualData.passportNumber,
    visualData.surname,
    visualData.nationality,
  ].filter(Boolean).length
  return headingCount + fieldCount
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
  if (
    type !== MACHINE_READABLE_DOCUMENT_TYPE.PASSPORT &&
    !hasTd3Mrz &&
    countPassportSignals(rawText, visualData) < MINIMUM_PASSPORT_SIGNALS
  ) {
    rejectNotPassport()
  }
}
