import type { OcrResult } from '@paddleocr/paddleocr-js'
import { OCR_STATUS, type OCRProgressStatus, type PassportExtraction } from '../types/passport'
import { OCR_CONFIG } from '../config/ocr'
import { prepareImageForOCR } from './imagePreprocessing.service'
import { logOCRResult } from './ocrDiagnostics.service'
import { initializeOCREngine, recognizeText } from './ocrEngine.service'
import { parseOCRResults } from './ocrResult.service'
import { PASSPORT_SCAN_ERROR, PassportScanError } from './passportScanError'
import { isExtractionComplete } from './scanPolicy.service'

export async function preparePassportOCR(): Promise<void> {
  await initializeOCREngine()
}

async function recognizePrimaryImage(file: File): Promise<OcrResult> {
  const image = await prepareImageForOCR(file)
  const result = await recognizeText(image)
  logOCRResult('primary passport image', result)
  return result
}

async function runDetailedFallback(
  file: File,
  primaryResult: OcrResult,
  initializationMs: number,
): Promise<PassportExtraction> {
  const detailedImage = await prepareImageForOCR(file, {
    ...OCR_CONFIG.detailedImage,
    enhanceContrast: true,
  })
  const detailedResult = await recognizeText(detailedImage, {
    minimumScore: OCR_CONFIG.detailedRecognitionScore,
    detectionSide: OCR_CONFIG.detailedDetectionSide,
  })
  logOCRResult('detailed passport image', detailedResult)
  return parseOCRResults([primaryResult, detailedResult], initializationMs)
}

function tryParsePrimaryResult(
  result: OcrResult,
  initializationMs: number,
): PassportExtraction | null {
  try {
    return parseOCRResults([result], initializationMs)
  } catch {
    return null
  }
}

/**
 * Reads a passport image with PaddleOCR.
 *
 * ICAO TD3 MRZ data is authoritative. Visual OCR is used for fields that are
 * absent from TD3 (notably the issue date) and as a recovery pass when the MRZ
 * cannot be read reliably from the primary image.
 */
export async function scanPassport(
  file: File,
  onStage: (stage: OCRProgressStatus) => void,
): Promise<PassportExtraction> {
  try {
    const initializationStartedAt = performance.now()
    await initializeOCREngine()
    const initializationMs = performance.now() - initializationStartedAt

    onStage(OCR_STATUS.RECOGNIZING)
    const primaryResult = await recognizePrimaryImage(file)

    onStage(OCR_STATUS.PARSING)
    const primaryExtraction = tryParsePrimaryResult(primaryResult, initializationMs)
    if (primaryExtraction && isExtractionComplete(primaryExtraction)) {
      return primaryExtraction
    }

    return runDetailedFallback(file, primaryResult, initializationMs)
  } catch (reason) {
    if (reason instanceof PassportScanError) throw reason
    if (import.meta.env.DEV) console.error('[Passport OCR]', reason)
    throw new PassportScanError(PASSPORT_SCAN_ERROR.OCR_FAILED, { cause: reason })
  }
}
