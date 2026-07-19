export const PASSPORT_SCAN_ERROR = {
  INVALID_FILE: 'INVALID_FILE',
  IMAGE_UNREADABLE: 'IMAGE_UNREADABLE',
  NOT_PASSPORT: 'NOT_PASSPORT',
  MRZ_NOT_FOUND: 'MRZ_NOT_FOUND',
  OCR_INITIALIZATION_FAILED: 'OCR_INITIALIZATION_FAILED',
  OCR_TIMEOUT: 'OCR_TIMEOUT',
  OCR_FAILED: 'OCR_FAILED',
} as const

export type PassportScanErrorCode =
  (typeof PASSPORT_SCAN_ERROR)[keyof typeof PASSPORT_SCAN_ERROR]

export class PassportScanError extends Error {
  readonly code: PassportScanErrorCode

  constructor(code: PassportScanErrorCode, options?: ErrorOptions) {
    super(code, options)
    this.name = 'PassportScanError'
    this.code = code
  }
}

export function getScanErrorCode(error: unknown): PassportScanErrorCode {
  return error instanceof PassportScanError
    ? error.code
    : PASSPORT_SCAN_ERROR.OCR_FAILED
}
