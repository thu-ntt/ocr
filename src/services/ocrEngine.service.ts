import type { OcrResult } from '@paddleocr/paddleocr-js'
import { OCR_CONFIG } from '../config/ocr'
import { withTimeout } from './async.service'
import { PASSPORT_SCAN_ERROR } from './passportScanError'

type OcrEngine = Awaited<
  ReturnType<typeof import('@paddleocr/paddleocr-js').PaddleOCR.create>
>

interface RecognitionOptions {
  minimumScore?: number
  detectionSide?: number
}

let enginePromise: Promise<OcrEngine> | undefined

async function createEngine(): Promise<OcrEngine> {
  const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
  return PaddleOCR.create({
    lang: OCR_CONFIG.language,
    ocrVersion: OCR_CONFIG.version,
    textDetectionModelName: OCR_CONFIG.detectionModel,
    textRecognitionModelName: OCR_CONFIG.recognitionModel,
    textRecognitionBatchSize: OCR_CONFIG.recognitionBatchSize,
    worker: true,
    ortOptions: {
      backend: OCR_CONFIG.backend,
      wasmPaths: OCR_CONFIG.wasmPath,
      numThreads: 1,
      simd: true,
    },
  })
}

export function initializeOCREngine(): Promise<OcrEngine> {
  enginePromise ??= withTimeout(
    createEngine(),
    OCR_CONFIG.initializationTimeoutMs,
    PASSPORT_SCAN_ERROR.OCR_INITIALIZATION_FAILED,
  ).catch((error: unknown) => {
    enginePromise = undefined
    throw error
  })
  return enginePromise
}

export async function recognizeText(
  image: File | HTMLCanvasElement,
  options: RecognitionOptions = {},
): Promise<OcrResult> {
  const engine = await initializeOCREngine()
  const [result] = await withTimeout(
    engine.predict(image, {
      textRecScoreThresh: options.minimumScore ?? OCR_CONFIG.minimumRecognitionScore,
      textDetLimitSideLen: options.detectionSide ?? OCR_CONFIG.maxDetectionSide,
      textDetLimitType: 'max',
    }),
    OCR_CONFIG.predictionTimeoutMs,
    PASSPORT_SCAN_ERROR.OCR_TIMEOUT,
  )
  if (!result) throw new Error('OCR returned no result')
  return result
}
