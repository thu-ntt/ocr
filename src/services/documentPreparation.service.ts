import type { PreparedDocument } from '../types/document'
import { validatePassportImage } from './imageValidation.service'
import { PassportScanError } from './passportScanError'
import { renderPassportPdf } from './pdf.service'

const PDF_TYPE = 'application/pdf'

export async function preparePassportDocument(file: File): Promise<PreparedDocument> {
  if (file.type === PDF_TYPE || file.name.toLowerCase().endsWith('.pdf')) {
    const { image, pageCount } = await renderPassportPdf(file)
    return { originalFile: file, ocrFile: image, kind: 'pdf', pageCount }
  }
  if (!file.type.startsWith('image/')) throw new PassportScanError('INVALID_FILE')
  await validatePassportImage(file)
  return { originalFile: file, ocrFile: file, kind: 'image', pageCount: 1 }
}
