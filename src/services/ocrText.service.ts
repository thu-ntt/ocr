import type { OcrResultItem } from '@paddleocr/paddleocr-js'
import { OCR_CONFIG } from '../config/ocr'

interface PositionedText {
  item: OcrResultItem
  left: number
  top: number
  centerY: number
  height: number
}

function position(item: OcrResultItem): PositionedText {
  const xs = item.poly.map(([x]) => x)
  const ys = item.poly.map(([, y]) => y)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return { item, left: Math.min(...xs), top, centerY: (top + bottom) / 2, height: bottom - top }
}

function median(values: number[]): number {
  if (!values.length) return OCR_CONFIG.fallbackTextHeight
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)] ?? OCR_CONFIG.fallbackTextHeight
}

function rowCenter(row: PositionedText[]): number {
  return row.reduce((total, text) => total + text.centerY, 0) / row.length
}

function groupRows(items: OcrResultItem[]): PositionedText[][] {
  const positioned = items
    .map(position)
    .sort((left, right) => left.centerY - right.centerY || left.left - right.left)
  const tolerance = median(positioned.map(({ height }) => height)) * OCR_CONFIG.rowToleranceFactor
  const rows: PositionedText[][] = []

  for (const item of positioned) {
    const row = rows.find((candidate) => Math.abs(rowCenter(candidate) - item.centerY) <= tolerance)
    if (row) row.push(item)
    else rows.push([item])
  }
  return rows
}

function rowText(row: PositionedText[]): string {
  return row
    .sort((left, right) => left.left - right.left)
    .map(({ item }) => item.text.trim())
    .filter(Boolean)
    .join(' ')
}

/** Reconstructs PaddleOCR boxes into top-to-bottom visual text rows. */
export function toTextLines(items: OcrResultItem[]): string[] {
  return groupRows(items)
    .sort((left, right) => Math.min(...left.map(({ top }) => top)) - Math.min(...right.map(({ top }) => top)))
    .map(rowText)
    .filter(Boolean)
}
