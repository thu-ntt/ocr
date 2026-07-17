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
  regionDetectionSide: 1_280,
  regionRecognitionScore: 0.12,
  initializationTimeoutMs: 90_000,
  predictionTimeoutMs: 45_000,
  backend: import.meta.env.VITE_OCR_BACKEND || 'auto',
  // Enterprise deployments should point this variable to a versioned, same-origin asset path.
  wasmPath: import.meta.env.VITE_ORT_WASM_PATH || 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/',
} as const

export const BUSY_OCR_STATUSES = new Set(['preparing', 'recognizing', 'parsing'])
