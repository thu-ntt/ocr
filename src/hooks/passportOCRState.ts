import { OCR_STATUS, type OCRProgressStatus, type OCRStatus, type PassportExtraction } from '../types/passport'

export interface PassportOCRState {
  status: OCRStatus
  file: File | null
  previewUrl: string
  result: PassportExtraction | null
  error: string
}

export const INITIAL_PASSPORT_OCR_STATE: PassportOCRState = {
  status: OCR_STATUS.IDLE,
  file: null,
  previewUrl: '',
  result: null,
  error: '',
}

export type PassportOCRAction =
  | { type: 'FILE_SELECTED'; file: File }
  | { type: 'IMAGE_READY'; previewUrl: string }
  | { type: 'SCAN_STARTED' }
  | { type: 'SCAN_STAGE_CHANGED'; status: OCRProgressStatus }
  | { type: 'SCAN_COMPLETED'; result: PassportExtraction }
  | { type: 'FAILED'; error: string }
  | { type: 'RESET' }

export function passportOCRReducer(state: PassportOCRState, action: PassportOCRAction): PassportOCRState {
  switch (action.type) {
    case 'FILE_SELECTED':
      return { ...INITIAL_PASSPORT_OCR_STATE, file: action.file, status: OCR_STATUS.PREPARING }
    case 'IMAGE_READY':
      return {
        ...state,
        previewUrl: action.previewUrl,
        status: OCR_STATUS.IDLE,
      }
    case 'SCAN_STARTED':
      return { ...state, status: OCR_STATUS.PREPARING, result: null, error: '' }
    case 'SCAN_STAGE_CHANGED':
      return { ...state, status: action.status }
    case 'SCAN_COMPLETED':
      return { ...state, status: OCR_STATUS.COMPLETE, result: action.result, error: '' }
    case 'FAILED':
      return { ...state, status: OCR_STATUS.ERROR, result: null, error: action.error }
    case 'RESET':
      return INITIAL_PASSPORT_OCR_STATE
  }
}
