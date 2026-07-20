import type { OcrResult } from '@paddleocr/paddleocr-js'
import type { OCRMetrics, PassportExtraction } from '../types/passport'
import { toTextLines } from './ocrText.service'
import { parsePassportText } from './passportParser.service'
import { PASSPORT_SCAN_ERROR, PassportScanError } from './passportScanError'

function resultText(result: OcrResult): string {
  return toTextLines(result.items).join('\n')
}

function averageConfidence(results: readonly OcrResult[]): number {
  const items = results.flatMap(({ items }) => items)
  if (!items.length) throw new PassportScanError(PASSPORT_SCAN_ERROR.OCR_FAILED)
  return items.reduce((total, item) => total + item.score, 0) / items.length
}

function aggregateMetrics(results: readonly OcrResult[], initializationMs: number): OCRMetrics {
  return results.reduce<OCRMetrics>((total, result) => ({
    initializationMs,
    detectionMs: total.detectionMs + result.metrics.detMs,
    recognitionMs: total.recognitionMs + result.metrics.recMs,
    totalMs: total.totalMs + result.metrics.totalMs,
    detectedBoxes: total.detectedBoxes + result.metrics.detectedBoxes,
    recognizedLines: total.recognizedLines + result.metrics.recognizedCount,
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

export function parseOCRResults(
  results: readonly OcrResult[],
  initializationMs: number,
): PassportExtraction {
  const rawText = results.map(resultText).filter(Boolean).join('\n')
  return parsePassportText(
    rawText,
    averageConfidence(results),
    aggregateMetrics(results, initializationMs),
  )
}
