import { resolveNationalityCode } from '../config/nationalities'
import { PASSPORT_PARSING_CONFIG } from '../config/passportParsing'
import { PASSPORT_VISUAL_LABELS } from '../config/passportVisualFields'
import type { PassportData } from '../types/passport'
import { readDateNearLabel, readTextAfterLabel } from './visualFieldReader.service'

const FIELD_LABEL = /\b(?:GIVEN\s*NAMES?|SURNAME|NATIONALITY|DATE\s*OF|SEX|PASSPORT|DOCUMENT)\b/i

// Passport numbers: a letter followed by 7–8 digits (most ICAO booklets),
// or a legacy alphanumeric 6–12 char code on a header line.
const PASSPORT_NUMBER_PATTERN = /\b([A-Z][0-9]{7,8}|[A-Z]{1,2}[0-9]{6,7})\b/

function passportNumber(value: string): string {
  const number = value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  return /^[A-Z0-9]{6,12}$/.test(number) ? number : ''
}

/**
 * Scans header lines for a standalone passport number when the label-based
 * reader returns nothing (e.g. Turkish "PASAPORT TUR ... U25889542").
 * Skips MRZ lines (they start with P< and contain runs of <) to avoid
 * mis-identifying a document code as the passport number.
 */
function passportNumberFallback(rawText: string): string {
  const nonMrzLines = rawText
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().toUpperCase().startsWith('P<') && !line.includes('<<'))

  for (const line of nonMrzLines) {
    const match = line.toUpperCase().match(PASSPORT_NUMBER_PATTERN)
    if (match?.[1]) return match[1]
  }
  return ''
}

function holderName(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ').toUpperCase()
  const isValid = name.length <= PASSPORT_PARSING_CONFIG.maxNameLength &&
    !FIELD_LABEL.test(name) &&
    /^[\p{L}][\p{L} '\u2019-]*$/u.test(name)
  return isValid ? name : ''
}

export function extractVisualPassportData(rawText: string): Partial<PassportData> {
  const labelledNumber = passportNumber(
    readTextAfterLabel(rawText, PASSPORT_VISUAL_LABELS.passportNumber),
  )
  return {
    passportNumber: labelledNumber || passportNumberFallback(rawText),
    surname: holderName(
      readTextAfterLabel(rawText, PASSPORT_VISUAL_LABELS.surname),
    ),
    givenName: holderName(
      readTextAfterLabel(rawText, PASSPORT_VISUAL_LABELS.givenName),
    ),
    fullName: holderName(
      readTextAfterLabel(rawText, PASSPORT_VISUAL_LABELS.fullName),
    ),
    nationality: resolveNationalityCode(
      readTextAfterLabel(rawText, PASSPORT_VISUAL_LABELS.nationality),
    ),
    issueDate: readDateNearLabel(rawText, PASSPORT_VISUAL_LABELS.issueDate),
  }
}

