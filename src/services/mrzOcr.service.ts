import { OCR_CONFIG } from '../config/ocr'
import { withTimeout } from './async.service'
import { PASSPORT_SCAN_ERROR } from './passportScanError'

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js').createWorker>>

let workerPromise: Promise<TesseractWorker> | undefined

async function createMrzWorker(): Promise<TesseractWorker> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const worker = await createWorker('eng', OEM.LSTM_ONLY)
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  return worker
}

function initializeMrzWorker(): Promise<TesseractWorker> {
  workerPromise ??= createMrzWorker().catch((error: unknown) => {
    workerPromise = undefined
    throw error
  })
  return workerPromise
}

/** Recognizes only ICAO MRZ characters from a preprocessed lower-page crop. */
export async function recognizeMrzText(image: HTMLCanvasElement): Promise<string> {
  const worker = await withTimeout(
    initializeMrzWorker(),
    OCR_CONFIG.initializationTimeoutMs,
    PASSPORT_SCAN_ERROR.OCR_INITIALIZATION_FAILED,
  )
  const result = await withTimeout(
    worker.recognize(image),
    OCR_CONFIG.predictionTimeoutMs,
    PASSPORT_SCAN_ERROR.OCR_TIMEOUT,
  )
  return result.data.text.trim()
}
