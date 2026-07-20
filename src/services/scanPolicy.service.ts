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

/** Complete MRZ fields are enough for an editable result, even with checksum warnings. */
export function hasCompleteMrzIdentity(extraction: PassportExtraction): boolean {
  return REQUIRED_FIELDS.every((field) => Boolean(extraction.data[field]))
}

/** Retry VIZ for the issue date before considering extraction complete. */
export function isExtractionComplete(extraction: PassportExtraction): boolean {
  return extraction.isMrzValid &&
    hasCompleteMrzIdentity(extraction) &&
    Boolean(extraction.data.issueDate)
}
