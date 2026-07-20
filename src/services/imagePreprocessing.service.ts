import { OCR_CONFIG } from '../config/ocr'

interface ImagePreparationOptions {
  minWidth?: number
  maxWidth?: number
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
    if (targetWidth === bitmap.width) return file

    const canvas = document.createElement('canvas')
    const scale = targetWidth / bitmap.width
    canvas.width = targetWidth
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return file
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    bitmap.close()
  }
}
