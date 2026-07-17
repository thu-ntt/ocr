import { PassportScanError } from './passportScanError'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 12 * 1024 * 1024
// Small web samples (for example 520×356) can still contain a readable TD3 MRZ.
const MIN_IMAGE_SIDE = 240
const FILE_SIGNATURES = {
  'image/jpeg': (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  'image/webp': (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
} as const

interface ImageDimensions { width: number; height: number }

function decodeWithImageElement(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')) }
    image.src = url
  })
}

async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file)
      const dimensions = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return dimensions
    } catch {
      // Some Safari/WebKit versions reject images that an HTMLImageElement can decode.
    }
  }
  return decodeWithImageElement(file)
}

export async function validatePassportImage(file: File): Promise<void> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size === 0 || file.size > MAX_FILE_SIZE) {
    throw new PassportScanError('INVALID_FILE')
  }
  try {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const matchesDeclaredType = FILE_SIGNATURES[file.type as keyof typeof FILE_SIGNATURES]?.(header) ?? false
    if (!matchesDeclaredType) throw new PassportScanError('INVALID_FILE')
    const dimensions = await readImageDimensions(file)
    const isLargeEnough = Math.min(dimensions.width, dimensions.height) >= MIN_IMAGE_SIDE
    if (!isLargeEnough) throw new PassportScanError('IMAGE_UNREADABLE')
  } catch (reason) {
    if (reason instanceof PassportScanError) throw reason
    throw new PassportScanError('IMAGE_UNREADABLE', { cause: reason })
  }
}
