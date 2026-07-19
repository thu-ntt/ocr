import { OCR_STATUS, type OCRStatus } from '../types/passport'

export const OCR_CONFIG = {
  language: 'en',
  version: 'PP-OCRv5',
  detectionModel: import.meta.env.VITE_OCR_DETECTION_MODEL || 'PP-OCRv6_tiny_det',
  recognitionModel: import.meta.env.VITE_OCR_RECOGNITION_MODEL || 'PP-OCRv6_tiny_rec',
  maxDetectionSide: 832,
  recognitionBatchSize: 8,
  // Passport print is often small or crossed by security artwork. Keep weak
  // candidates here and let MRZ/domain validation decide whether they are valid.
  minimumRecognitionScore: 0.28,
  detailedDetectionSide: 1_120,
  detailedRecognitionScore: 0.2,
  standardImage: { minWidth: 720, maxWidth: 1_100 },
  detailedImage: { minWidth: 1_100, maxWidth: 1_400 },
  initializationTimeoutMs: 90_000,
  predictionTimeoutMs: 45_000,
  rowToleranceFactor: 0.65,
  fallbackTextHeight: 10,
  backend: import.meta.env.VITE_OCR_BACKEND || 'auto',
  // Enterprise deployments should point this variable to a versioned, same-origin asset path.
  wasmPath: import.meta.env.VITE_ORT_WASM_PATH || 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/',
} as const

export const BUSY_OCR_STATUSES: ReadonlySet<OCRStatus> = new Set([
  OCR_STATUS.PREPARING,
  OCR_STATUS.RECOGNIZING,
  OCR_STATUS.PARSING,
])
