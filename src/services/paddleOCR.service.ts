import type { PassportExtraction } from '../types/passport'
import { parsePassportText } from './passportParser.service'
import { PassportScanError } from './passportScanError'
import { toTextLines } from './ocrText.service'
import { prepareImageForOCR, prepareImageRegionForOCR } from './imagePreprocessing.service'
import { initializeOCREngine, recognizeText } from './ocrEngine.service'
import type { OcrResult } from '@paddleocr/paddleocr-js'
import { getIssueDateRegion } from '../config/passportProfiles'
import { OCR_CONFIG } from '../config/ocr'
import { assessExtractionQuality } from './scanPolicy.service'

export async function preparePassportOCR(): Promise<void> {
  await initializeOCREngine()
}

function logRawOCR(label: string, result: OcrResult): void {
  if (!import.meta.env.DEV) return
  const rawText = toTextLines(result.items).join('\n')
  console.groupCollapsed(`[Passport OCR] ${label}`)
  console.log(rawText)
  console.table(result.items.map((item) => ({ text: item.text, score: Number(item.score.toFixed(4)) })))
  console.groupEnd()
}

function mergeMetrics(results: readonly OcrResult[], initializationMs: number): PassportExtraction['metrics'] {
  return results.reduce<PassportExtraction['metrics']>((metrics, result) => ({
    ...metrics,
    detectionMs: metrics.detectionMs + result.metrics.detMs,
    recognitionMs: metrics.recognitionMs + result.metrics.recMs,
    totalMs: metrics.totalMs + result.metrics.totalMs,
    detectedBoxes: metrics.detectedBoxes + result.metrics.detectedBoxes,
    recognizedLines: metrics.recognizedLines + result.metrics.recognizedCount,
    backend: result.runtime.detProvider,
  }), {
    initializationMs,
    detectionMs: 0,
    recognitionMs: 0,
    totalMs: 0,
    detectedBoxes: 0,
    recognizedLines: 0,
    backend: 'unknown',
  })
}

function parseOCRResults(results: readonly OcrResult[], initializationMs: number): PassportExtraction {
  const items = results.flatMap((result) => result.items)
  if (!items.length) throw new PassportScanError('OCR_FAILED')

  // Each pass has its own coordinate system. Reconstruct its rows first, then
  // concatenate text; mixing full-image and crop coordinates corrupts reading order.
  const rawText = results.flatMap((result) => toTextLines(result.items)).join('\n')
  const confidence = items.reduce((sum, item) => sum + item.score, 0) / items.length
  return parsePassportText(rawText, confidence, {
    ...mergeMetrics(results, initializationMs),
  })
}

async function runVisualFallback(file: File, primary: OcrResult, initializationMs: number): Promise<PassportExtraction> {
  const detailedImage = await prepareImageForOCR(file, { minWidth: 1_100, maxWidth: 1_400 })
  const fallback = await recognizeText(detailedImage, { minimumScore: 0.2, detectionSide: OCR_CONFIG.detailedDetectionSide })
  logRawOCR('generic fallback raw text', fallback)
  return parseOCRResults([primary, fallback], initializationMs)
}

async function runRegionFallback(file: File, primary: OcrResult, extraction: PassportExtraction, initializationMs: number): Promise<PassportExtraction | undefined> {
  const region = getIssueDateRegion(extraction.data.nationality)
  if (!region) return undefined
  const croppedImage = await prepareImageRegionForOCR(file, region)
  // Reuse the warm primary engine. Initializing a second PP-OCR model here adds
  // a large download and memory spike to the first fallback scan.
  const regional = await recognizeText(croppedImage, {
    minimumScore: OCR_CONFIG.regionRecognitionScore,
    detectionSide: OCR_CONFIG.regionDetectionSide,
  })
  logRawOCR(`issue-date ROI (${extraction.data.nationality}) raw text`, regional)
  return parseOCRResults([primary, regional], initializationMs)
}

export async function scanPassport(file: File, onStage: (stage: 'recognizing' | 'parsing') => void): Promise<PassportExtraction> {
  try {
    const initializationStartedAt = performance.now()
    await initializeOCREngine()
    const initializationMs = performance.now() - initializationStartedAt
    onStage('recognizing')
    const image = await prepareImageForOCR(file)
    const result = await recognizeText(image)
    logRawOCR('primary raw text', result)
    onStage('parsing')
    let extraction: PassportExtraction | undefined
    try { extraction = parseOCRResults([result], initializationMs) } catch { /* retry with the detailed pass */ }
    if (extraction && assessExtractionQuality(extraction).accepted) return extraction
    if (extraction) {
      const quality = assessExtractionQuality(extraction)
      if (quality.needsIssueDate) {
        try {
          const regionalExtraction = await runRegionFallback(file, result, extraction, initializationMs)
          if (regionalExtraction && assessExtractionQuality(regionalExtraction).accepted) return regionalExtraction
        } catch { /* continue with the generic detailed pass */ }
      }
    }
    return await runVisualFallback(file, result, initializationMs)
  } catch (reason) {
    if (reason instanceof PassportScanError) throw reason
    if (import.meta.env.DEV) console.error('[Passport OCR]', reason)
    throw new PassportScanError('OCR_FAILED', { cause: reason })
  }
}
