const MEGABYTE = 1024 * 1024

export const PASSPORT_UPLOAD_CONFIG = {
  acceptedFiles: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
  },
  maxFiles: 1,
  maxFileSize: 12 * MEGABYTE,
  minImageSide: 240,
  signatureBytes: 12,
} as const

export const PASSPORT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const
export const PASSPORT_IMAGE_ACCEPT = PASSPORT_IMAGE_EXTENSIONS.join(',')
export const GENERIC_FILE_TYPES: ReadonlySet<string> = new Set([
  '',
  'application/octet-stream',
])

export const PASSPORT_IMAGE_TYPES: ReadonlySet<string> = new Set(
  Object.keys(PASSPORT_UPLOAD_CONFIG.acceptedFiles),
)

export function isAcceptedPassportFile(file: File): boolean {
  const fileName = file.name.toLowerCase()
  const supportedFormat = PASSPORT_IMAGE_TYPES.has(file.type) ||
    PASSPORT_IMAGE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  return supportedFormat && file.size > 0 && file.size <= PASSPORT_UPLOAD_CONFIG.maxFileSize
}
