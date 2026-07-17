import type { OcrResultItem } from '@paddleocr/paddleocr-js'

interface PositionedLine {
  item: OcrResultItem
  x: number
  y: number
  centerY: number
  height: number
}

function position(item: OcrResultItem): PositionedLine {
  const xs = item.poly.map(([x]) => x)
  const ys = item.poly.map(([, y]) => y)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return { item, x: Math.min(...xs), y: top, centerY: (top + bottom) / 2, height: bottom - top }
}

/** Normalizes detector output into stable top-to-bottom, left-to-right reading order. */
export function toReadingOrder(items: OcrResultItem[]): OcrResultItem[] {
  const positioned = items.map(position)
  const medianHeight = positioned.map((line) => line.height).sort((a, b) => a - b)[Math.floor(positioned.length / 2)] || 10
  const rowTolerance = medianHeight * 0.65
  return positioned.sort((a, b) => Math.abs(a.y - b.y) <= rowTolerance ? a.x - b.x : a.y - b.y).map(({ item }) => item)
}

/**
 * Reconstructs visual rows from PaddleOCR boxes.
 *
 * Recognition commonly returns `24`, `MAR`, and `2025` as separate items.
 * Joining every item with a newline makes a valid date impossible to parse, so
 * horizontally aligned boxes must first be restored to the same text row.
 */
export function toTextLines(items: OcrResultItem[]): string[] {
  if (!items.length) return []

  const positioned = items.map(position).sort((a, b) => a.centerY - b.centerY || a.x - b.x)
  const medianHeight = positioned
    .map(({ height }) => height)
    .sort((a, b) => a - b)[Math.floor(positioned.length / 2)] || 10
  const rowTolerance = medianHeight * 0.65
  const rows: PositionedLine[][] = []

  for (const line of positioned) {
    const row = rows.find((candidate) => {
      const center = candidate.reduce((sum, entry) => sum + entry.centerY, 0) / candidate.length
      return Math.abs(center - line.centerY) <= rowTolerance
    })
    if (row) row.push(line)
    else rows.push([line])
  }

  return rows
    .sort((a, b) => Math.min(...a.map(({ y }) => y)) - Math.min(...b.map(({ y }) => y)))
    .map((row) => row.sort((a, b) => a.x - b.x).map(({ item }) => item.text.trim()).filter(Boolean).join(' '))
    .filter(Boolean)
}
