import type { OcrResult } from '@paddleocr/paddleocr-js'
import { OCR_CONFIG } from '../config/ocr'
import { withTimeout } from './async.service'

type OcrEngine = Awaited<ReturnType<typeof import('@paddleocr/paddleocr-js').PaddleOCR.create>>
let enginePromise: Promise<OcrEngine> | undefined

function createEngine(): Promise<OcrEngine> {
  return import('@paddleocr/paddleocr-js').then(({ PaddleOCR }) => PaddleOCR.create({
    lang: OCR_CONFIG.language,
    ocrVersion: OCR_CONFIG.version,
    textDetectionModelName: OCR_CONFIG.detectionModel,
    textRecognitionModelName: OCR_CONFIG.recognitionModel,
    textRecognitionBatchSize: OCR_CONFIG.recognitionBatchSize,
    worker: true,
    ortOptions: { backend: OCR_CONFIG.backend, wasmPaths: OCR_CONFIG.wasmPath, numThreads: 1, simd: true },
  }))
}

export function initializeOCREngine(): Promise<OcrEngine> {
  enginePromise ??= withTimeout(createEngine(), OCR_CONFIG.initializationTimeoutMs, 'OCR_INITIALIZATION_FAILED')
    .catch((reason: unknown) => { enginePromise = undefined; throw reason })
  return enginePromise
}

interface RecognitionOptions { minimumScore?: number; detectionSide?: number }

async function predict(engine: OcrEngine, image: File | HTMLCanvasElement, options: RecognitionOptions): Promise<OcrResult> {
  const results = await withTimeout(engine.predict(image, {
    textRecScoreThresh: options.minimumScore ?? OCR_CONFIG.minimumRecognitionScore,
    textDetLimitSideLen: options.detectionSide ?? OCR_CONFIG.maxDetectionSide,
    textDetLimitType: 'max',
  }), OCR_CONFIG.predictionTimeoutMs, 'OCR_TIMEOUT')
  const result = results[0]
  if (!result) throw new Error('OCR returned no result')
  return result
}

export async function recognizeText(image: File | HTMLCanvasElement, options: RecognitionOptions = {}): Promise<OcrResult> {
  const engine = await initializeOCREngine()
  return predict(engine, image, options)
}
