const MIN_OCR_WIDTH = 720
const MAX_OCR_WIDTH = 1_100

interface ImagePreparationOptions { minWidth?: number; maxWidth?: number }
interface NormalizedRegion { x: number; y: number; width: number; height: number }

export async function prepareImageForOCR(file: File, options: ImagePreparationOptions = {}): Promise<File | HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const targetWidth = Math.min(options.maxWidth ?? MAX_OCR_WIDTH, Math.max(options.minWidth ?? MIN_OCR_WIDTH, bitmap.width))
  if (targetWidth === bitmap.width) { bitmap.close(); return file }

  const canvas = document.createElement('canvas')
  const scale = targetWidth / bitmap.width
  canvas.width = targetWidth
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) { bitmap.close(); return file }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

export async function prepareImageRegionForOCR(file: File, region: NormalizedRegion, targetWidth = 1_400): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const sourceX = Math.round(bitmap.width * region.x)
  const sourceY = Math.round(bitmap.height * region.y)
  const sourceWidth = Math.round(bitmap.width * region.width)
  const sourceHeight = Math.round(bitmap.height * region.height)
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = Math.round(targetWidth * sourceHeight / sourceWidth)
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) { bitmap.close(); throw new Error('Unable to create crop canvas') }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}
