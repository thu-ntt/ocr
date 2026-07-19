import {
  GENERIC_FILE_TYPES,
  isAcceptedPassportFile,
  PASSPORT_UPLOAD_CONFIG,
} from '../config/passportUpload'
import { PASSPORT_SCAN_ERROR, PassportScanError } from './passportScanError'

interface ImageDimensions {
  width: number
  height: number
}

interface ImageSignature {
  mimeType: string
  matches: (bytes: Uint8Array) => boolean
}

const IMAGE_SIGNATURES: readonly ImageSignature[] = [
  {
    mimeType: 'image/jpeg',
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    matches: (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  },
  {
    mimeType: 'image/webp',
    matches: (bytes) =>
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
  },
]

function invalidFile(): PassportScanError {
  return new PassportScanError(PASSPORT_SCAN_ERROR.INVALID_FILE)
}

function unreadableImage(cause?: unknown): PassportScanError {
  return new PassportScanError(PASSPORT_SCAN_ERROR.IMAGE_UNREADABLE, { cause })
}

async function detectImageType(file: File): Promise<string> {
  const buffer = await file
    .slice(0, PASSPORT_UPLOAD_CONFIG.signatureBytes)
    .arrayBuffer()
  const bytes = new Uint8Array(buffer)
  return IMAGE_SIGNATURES.find(({ matches }) => matches(bytes))?.mimeType ?? ''
}

function assertFileType(file: File, detectedType: string): void {
  const browserTypeIsGeneric = GENERIC_FILE_TYPES.has(file.type)
  if (!detectedType || (!browserTypeIsGeneric && file.type !== detectedType)) {
    throw invalidFile()
  }
}

async function dimensionsFromBitmap(file: File): Promise<ImageDimensions> {
  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

function dimensionsFromImage(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    const finish = (callback: () => void) => {
      URL.revokeObjectURL(url)
      callback()
    }
    image.onload = () => finish(() => resolve({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }))
    image.onerror = () => finish(() => reject(new Error('Image decode failed')))
    image.src = url
  })
}

async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap !== 'function') return dimensionsFromImage(file)

  try {
    // Await here so bitmap decode failures use the HTMLImageElement fallback.
    return await dimensionsFromBitmap(file)
  } catch {
    return dimensionsFromImage(file)
  }
}

function assertMinimumSize({ width, height }: ImageDimensions): void {
  if (Math.min(width, height) < PASSPORT_UPLOAD_CONFIG.minImageSide) {
    throw unreadableImage()
  }
}

export async function validatePassportImage(file: File): Promise<void> {
  if (!isAcceptedPassportFile(file)) throw invalidFile()

  try {
    const detectedType = await detectImageType(file)
    assertFileType(file, detectedType)
    assertMinimumSize(await readImageDimensions(file))
  } catch (error) {
    if (error instanceof PassportScanError) throw error
    throw unreadableImage(error)
  }
}
