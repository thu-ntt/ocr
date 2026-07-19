import type { OcrResult } from '@paddleocr/paddleocr-js'
import { toTextLines } from './ocrText.service'

export function logOCRResult(label: string, result: OcrResult): void {
  if (!import.meta.env.DEV) return
  console.groupCollapsed(`[Passport OCR] ${label}`)
  console.log(toTextLines(result.items).join('\n'))
  console.table(result.items.map((item) => ({
    text: item.text,
    score: Number(item.score.toFixed(4)),
  })))
  console.groupEnd()
}
