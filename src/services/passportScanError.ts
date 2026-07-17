export type PassportScanErrorCode = 'INVALID_FILE' | 'IMAGE_UNREADABLE' | 'PDF_INVALID' | 'PDF_TOO_MANY_PAGES' | 'PDF_PASSWORD_PROTECTED' | 'NOT_PASSPORT' | 'MRZ_NOT_FOUND' | 'OCR_INITIALIZATION_FAILED' | 'OCR_TIMEOUT' | 'OCR_FAILED'

export class PassportScanError extends Error {
  readonly code: PassportScanErrorCode

  constructor(code: PassportScanErrorCode, options?: ErrorOptions) {
    super(code, options)
    this.name = 'PassportScanError'
    this.code = code
  }
}

export function getScanErrorCode(reason: unknown): PassportScanErrorCode {
  return reason instanceof PassportScanError ? reason.code : 'OCR_FAILED'
}
