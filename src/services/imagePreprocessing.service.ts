import { OCR_CONFIG } from '../config/ocr'

interface ImagePreparationOptions {
  minWidth?: number
  maxWidth?: number
  enhanceContrast?: boolean
}

/**
 * Samples a small grid of pixels and returns the mean brightness (0–255).
 * Used to detect overexposed / faded scans that need contrast boosting.
 */
function sampleMeanBrightness(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 20))
  let total = 0
  let count = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      total += (0.299 * (r ?? 0) + 0.587 * (g ?? 0) + 0.114 * (b ?? 0))
      count++
    }
  }
  return count ? total / count : 128
}

/**
 * Boosts contrast in-place on a canvas. Applies a sigmoid-like linear stretch
 * so dark ink becomes darker and bright backgrounds stay white.
 * Only runs when the image is detected as faded (mean brightness > threshold).
 */
function enhanceContrastForOCR(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const mean = sampleMeanBrightness(ctx, width, height)
  // Only enhance if the image looks faded/overexposed
  if (mean < 210) return

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  // Linear contrast stretch: darken midtones, push highlights toward white.
  // Factor > 1 increases contrast; the specific value is tuned empirically for
  // MRZ text on bleached passport photocopies.
  const factor = 2.0
  const intercept = 128 * (1 - factor)
  for (let i = 0; i < data.length; i += 4) {
    data[i]!     = Math.min(255, Math.max(0, factor * data[i]!     + intercept))
    data[i + 1]! = Math.min(255, Math.max(0, factor * data[i + 1]! + intercept))
    data[i + 2]! = Math.min(255, Math.max(0, factor * data[i + 2]! + intercept))
  }
  ctx.putImageData(imageData, 0, 0)
}

export async function prepareImageForOCR(
  file: File,
  options: ImagePreparationOptions = {},
): Promise<File | HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  try {
    const minWidth = options.minWidth ?? OCR_CONFIG.standardImage.minWidth
    const maxWidth = options.maxWidth ?? OCR_CONFIG.standardImage.maxWidth
    const targetWidth = Math.min(maxWidth, Math.max(minWidth, bitmap.width))

    const canvas = document.createElement('canvas')
    const scale = targetWidth / bitmap.width
    canvas.width = targetWidth
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return file
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    if (options.enhanceContrast) {
      enhanceContrastForOCR(context, canvas.width, canvas.height)
    }

    // Skip re-encoding if the image is already the right size and no enhancement needed
    if (targetWidth === bitmap.width && !options.enhanceContrast) return file

    return canvas
  } finally {
    bitmap.close()
  }
}

