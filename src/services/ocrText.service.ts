import type { OcrResultItem } from '@paddleocr/paddleocr-js'

interface PositionedLine { item: OcrResultItem; x: number; y: number; height: number }

function position(item: OcrResultItem): PositionedLine {
  const xs = item.poly.map(([x]) => x)
  const ys = item.poly.map(([, y]) => y)
  return { item, x: Math.min(...xs), y: Math.min(...ys), height: Math.max(...ys) - Math.min(...ys) }
}

/** Normalizes detector output into stable top-to-bottom, left-to-right reading order. */
export function toReadingOrder(items: OcrResultItem[]): OcrResultItem[] {
  const positioned = items.map(position)
  const medianHeight = positioned.map((line) => line.height).sort((a, b) => a - b)[Math.floor(positioned.length / 2)] || 10
  const rowTolerance = medianHeight * 0.65
  return positioned.sort((a, b) => Math.abs(a.y - b.y) <= rowTolerance ? a.x - b.x : a.y - b.y).map(({ item }) => item)
}
