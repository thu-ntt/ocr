import { resolveNationalityCode } from '../config/nationalities'
import { PASSPORT_PARSING_CONFIG } from '../config/passportParsing'
import { PASSPORT_VISUAL_LABELS } from '../config/passportVisualFields'
import type { PassportData } from '../types/passport'
import { readDateNearLabel, readTextAfterLabel } from './visualFieldReader.service'

const FIELD_LABEL = /\b(?:GIVEN\s*NAMES?|SURNAME|NATIONALITY|DATE\s*OF|SEX|PASSPORT|DOCUMENT)\b/i

function passportNumber(value: string): string {
  const number = value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  return /^[A-Z0-9]{6,12}$/.test(number) ? number : ''
}

function inferredPassportNumber(rawText: string): string {
  return rawText.toUpperCase().match(/\b[A-Z][0-9]{8}\b/)?.[0] ?? ''
}

function holderName(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ').toUpperCase()
  const isValid = name.length <= PASSPORT_PARSING_CONFIG.maxNameLength &&
    !FIELD_LABEL.test(name) &&
    /^[\p{L}][\p{L} '\u2019-]*$/u.test(name)
  return isValid ? name : ''
}

export function extractVisualPassportData(rawText: string): Partial<PassportData> {
  const labelledPassportNumber = passportNumber(
    readTextAfterLabel(rawText, PASSPORT_VISUAL_LABELS.passportNumber),
  )

  return {
    passportNumber: labelledPassportNumber || inferredPassportNumber(rawText),
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
