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

export interface PassportExtraction {
  data: PassportData
  confidence: FieldConfidence
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

export type OCRStatus = 'idle' | 'preparing' | 'recognizing' | 'parsing' | 'complete' | 'error'
