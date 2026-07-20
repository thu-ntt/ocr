import { OCR_CONFIG } from '../config/ocr'

interface ImagePreparationOptions {
  minWidth?: number
  maxWidth?: number
}

function histogramBoundary(
  histogram: Uint32Array,
  target: number,
  fromDark: boolean,
): number {
  let count = 0
  for (let offset = 0; offset < histogram.length; offset += 1) {
    const value = fromDark ? offset : histogram.length - 1 - offset
    count += histogram[value] ?? 0
    if (count >= target) return value
  }
  return fromDark ? 0 : 255
}

function enhanceMrzContrast(context: CanvasRenderingContext2D, width: number, height: number): void {
  const image = context.getImageData(0, 0, width, height)
  const histogram = new Uint32Array(256)

  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = Math.round(
      (image.data[index] ?? 0) * 0.299 +
      (image.data[index + 1] ?? 0) * 0.587 +
      (image.data[index + 2] ?? 0) * 0.114,
    )
    histogram[luminance] = (histogram[luminance] ?? 0) + 1
  }

  const pixelCount = width * height
  const low = histogramBoundary(histogram, Math.round(pixelCount * 0.02), true)
  const high = histogramBoundary(histogram, Math.round(pixelCount * 0.02), false)
  const range = Math.max(1, high - low)

  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = Math.round(
      (image.data[index] ?? 0) * 0.299 +
      (image.data[index + 1] ?? 0) * 0.587 +
      (image.data[index + 2] ?? 0) * 0.114,
    )
    const enhanced = Math.max(0, Math.min(255, Math.round((luminance - low) * 255 / range)))
    image.data[index] = enhanced
    image.data[index + 1] = enhanced
    image.data[index + 2] = enhanced
  }

  context.putImageData(image, 0, 0)
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

/** Crops and enlarges the lower passport area where ICAO TD3 MRZ is printed. */
export async function prepareMrzForOCR(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  try {
    const { cropStartRatio, minWidth, maxWidth } = OCR_CONFIG.mrzImage
    const sourceY = Math.floor(bitmap.height * cropStartRatio)
    const sourceHeight = bitmap.height - sourceY
    const targetWidth = Math.min(maxWidth, Math.max(minWidth, bitmap.width))
    const scale = targetWidth / bitmap.width
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = Math.max(1, Math.round(sourceHeight * scale))

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Unable to create MRZ canvas')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      bitmap,
      0,
      sourceY,
      bitmap.width,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    enhanceMrzContrast(context, canvas.width, canvas.height)
    return canvas
  } finally {
    bitmap.close()
  }
}
