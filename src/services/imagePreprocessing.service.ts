const MIN_OCR_WIDTH = 720
const MAX_OCR_WIDTH = 1_100

export async function prepareImageForOCR(file: File): Promise<File | HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const targetWidth = Math.min(MAX_OCR_WIDTH, Math.max(MIN_OCR_WIDTH, bitmap.width))
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
