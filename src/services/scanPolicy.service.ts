import type { PassportExtraction, PassportField } from '../types/passport'

const REQUIRED_FIELDS = [
  'passportNumber',
  'surname',
  'givenName',
  'nationality',
  'gender',
  'dateOfBirth',
  'expiryDate',
] as const satisfies readonly PassportField[]

/** Determines whether an expensive high-resolution OCR pass can be skipped. */
export function isExtractionComplete(extraction: PassportExtraction): boolean {
  return extraction.isMrzValid &&
    REQUIRED_FIELDS.every((field) => Boolean(extraction.data[field])) &&
    Boolean(extraction.data.issueDate)
}
