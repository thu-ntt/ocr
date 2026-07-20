import type { OcrResult } from '@paddleocr/paddleocr-js'
import { OCR_STATUS, type OCRProgressStatus, type PassportExtraction } from '../types/passport'
import { OCR_CONFIG } from '../config/ocr'
import { prepareImageForOCR, prepareMrzForOCR } from './imagePreprocessing.service'
import { logOCRResult } from './ocrDiagnostics.service'
import { initializeOCREngine, recognizeText } from './ocrEngine.service'
import { parseOCRResults } from './ocrResult.service'
import { PASSPORT_SCAN_ERROR, PassportScanError } from './passportScanError'
import { hasCompleteMrzIdentity, isExtractionComplete } from './scanPolicy.service'
import { recognizeMrzText } from './mrzOcr.service'

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
  const detailedImage = await prepareImageForOCR(file, OCR_CONFIG.detailedImage)
  const detailedResult = await recognizeText(detailedImage, {
    minimumScore: OCR_CONFIG.detailedRecognitionScore,
    detectionSide: OCR_CONFIG.detailedDetectionSide,
  })
  logOCRResult('detailed passport image', detailedResult)
  let detailedExtraction: PassportExtraction | null = null
  try {
    detailedExtraction = parseOCRResults(
      [primaryResult, detailedResult],
      initializationMs,
    )
  } catch {
    // A full-page pass may still miss MRZ on blurred or heavily redacted VIZ.
  }
  if (detailedExtraction && hasCompleteMrzIdentity(detailedExtraction)) {
    return detailedExtraction
  }

  const mrzImage = await prepareMrzForOCR(file)
  const mrzResult = await recognizeText(mrzImage, {
    minimumScore: OCR_CONFIG.detailedRecognitionScore,
    detectionSide: OCR_CONFIG.detailedDetectionSide,
  })
  logOCRResult('passport MRZ crop', mrzResult)
  let paddleMrzExtraction: PassportExtraction | null = null
  try {
    paddleMrzExtraction = parseOCRResults(
      [primaryResult, detailedResult, mrzResult],
      initializationMs,
    )
  } catch {
    // Tesseract gets a final chance when general OCR still misses TD3.
  }
  if (paddleMrzExtraction && hasCompleteMrzIdentity(paddleMrzExtraction)) {
    return paddleMrzExtraction
  }

  let tesseractMrzText = ''
  try {
    tesseractMrzText = await recognizeMrzText(mrzImage)
  } catch (reason) {
    if (paddleMrzExtraction) return paddleMrzExtraction
    if (detailedExtraction) return detailedExtraction
    throw reason
  }
  if (import.meta.env.DEV) console.info('[Passport OCR] Tesseract MRZ crop', tesseractMrzText)
  return parseOCRResults(
    [primaryResult, detailedResult, mrzResult],
    initializationMs,
    tesseractMrzText,
  )
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

    try {
      return await runDetailedFallback(file, primaryResult, initializationMs)
    } catch (reason) {
      // A detailed recovery pass must not discard a primary result that was
      // already accepted as a passport. Return its editable partial data.
      if (primaryExtraction) {
        return primaryExtraction
      }
      throw reason
    }
  } catch (reason) {
    if (reason instanceof PassportScanError) throw reason
    if (import.meta.env.DEV) console.error('[Passport OCR]', reason)
    throw new PassportScanError(PASSPORT_SCAN_ERROR.OCR_FAILED, { cause: reason })
  }
}
