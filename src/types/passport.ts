export type Gender = 'M' | 'F' | 'X' | ''

export interface PassportData {
  passportNumber: string
  surname: string
  givenName: string
  fullName: string
  nationality: string
  gender: Gender
  dateOfBirth: string
  issueDate: string
  expiryDate: string
}

export type PassportField = keyof PassportData
export type FieldConfidence = Partial<Record<PassportField, number>>

export const PASSPORT_FIELD_SOURCE = {
  MRZ: 'mrz',
  VISUAL_LABEL: 'visual-label',
  VISUAL_INFERENCE: 'visual-inference',
  DERIVED: 'derived',
  MISSING: 'missing',
} as const

export type PassportFieldSource = typeof PASSPORT_FIELD_SOURCE[keyof typeof PASSPORT_FIELD_SOURCE]

export interface PassportFieldEvidence<T = string> {
  value: T
  source: PassportFieldSource
  confidence: number
}

export type PassportEvidence = {
  [Field in PassportField]: PassportFieldEvidence<PassportData[Field]>
}

export interface PassportExtraction {
  data: PassportData
  confidence: FieldConfidence
  evidence: PassportEvidence
  rawText: string
  mrz: string[]
  warnings: string[]
  isMrzValid: boolean
  metrics: OCRMetrics
}

export interface OCRMetrics {
  initializationMs?: number
  detectionMs: number
  recognitionMs: number
  totalMs: number
  detectedBoxes: number
  recognizedLines: number
  backend: string
}

export const OCR_STATUS = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  RECOGNIZING: 'recognizing',
  PARSING: 'parsing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const

export type OCRStatus = typeof OCR_STATUS[keyof typeof OCR_STATUS]
export type OCRProgressStatus = typeof OCR_STATUS.RECOGNIZING | typeof OCR_STATUS.PARSING
