import type { PassportExtraction } from '../types/passport'
import { parsePassportText } from './passportParser.service'
import { PassportScanError } from './passportScanError'
import { toReadingOrder } from './ocrText.service'
import { prepareImageForOCR } from './imagePreprocessing.service'
import { initializeOCREngine, recognizeText } from './ocrEngine.service'

export async function preparePassportOCR(): Promise<void> {
  await initializeOCREngine()
}

export async function scanPassport(file: File, onStage: (stage: 'recognizing' | 'parsing') => void): Promise<PassportExtraction> {
  try {
    const initializationStartedAt = performance.now()
    await initializeOCREngine()
    const initializationMs = performance.now() - initializationStartedAt
    onStage('recognizing')
    const image = await prepareImageForOCR(file)
    const result = await recognizeText(image)
    onStage('parsing')
    if (!result?.items.length) throw new PassportScanError('OCR_FAILED')
    const orderedItems = toReadingOrder(result.items)
    const rawText = orderedItems.map((item) => item.text).join('\n')
    const confidence = orderedItems.reduce((sum, item) => sum + item.score, 0) / orderedItems.length
    return parsePassportText(rawText, confidence, {
      initializationMs,
      detectionMs: result.metrics.detMs,
      recognitionMs: result.metrics.recMs,
      totalMs: result.metrics.totalMs,
      detectedBoxes: result.metrics.detectedBoxes,
      recognizedLines: result.metrics.recognizedCount,
      backend: result.runtime.detProvider,
    })
  } catch (reason) {
    if (reason instanceof PassportScanError) throw reason
    if (import.meta.env.DEV) console.error('[Passport OCR]', reason)
    throw new PassportScanError('OCR_FAILED', { cause: reason })
  }
}
