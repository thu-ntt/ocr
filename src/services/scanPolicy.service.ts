import type { PassportData, PassportExtraction, PassportField } from '../types/passport'

const REQUIRED_FIELDS = [
  'passportNumber',
  'surname',
  'givenName',
  'nationality',
  'gender',
  'dateOfBirth',
  'expiryDate',
] as const satisfies readonly PassportField[]

export interface ExtractionQuality {
  accepted: boolean
  missingFields: PassportField[]
  needsIssueDate: boolean
  needsMrzRecovery: boolean
}

/** Central policy for deciding whether another expensive OCR pass is justified. */
export function assessExtractionQuality(extraction: PassportExtraction): ExtractionQuality {
  const missingFields = REQUIRED_FIELDS.filter((field) => !extraction.data[field])
  const needsIssueDate = !extraction.data.issueDate
  const needsMrzRecovery = !extraction.isMrzValid || missingFields.length > 0
  return {
    accepted: !needsMrzRecovery && !needsIssueDate,
    missingFields: [...missingFields],
    needsIssueDate,
    needsMrzRecovery,
  }
}

export function hasCompletePassportData(data: PassportData): boolean {
  return REQUIRED_FIELDS.every((field) => Boolean(data[field])) && Boolean(data.issueDate)
}
