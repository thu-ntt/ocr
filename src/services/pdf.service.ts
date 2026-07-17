import { PassportScanError } from './passportScanError'

const PDF_SIGNATURE = '%PDF-'
const MAX_PDF_PAGES = 5
// Match the maximum OCR input width to avoid rendering and then downscaling again.
const PDF_RENDER_WIDTH = 1_100

async function hasPdfSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer())
  return new TextDecoder('ascii').decode(bytes) === PDF_SIGNATURE
}

export async function renderPassportPdf(file: File): Promise<{ image: File; pageCount: number }> {
  if (!(await hasPdfSignature(file))) throw new PassportScanError('PDF_INVALID')
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

    const bytes = new Uint8Array(await file.arrayBuffer())
    const loadingTask = pdfjs.getDocument({ data: bytes, useWorkerFetch: false })
    const pdfDocument = await loadingTask.promise
    const pageCount = pdfDocument.numPages
    if (pageCount > MAX_PDF_PAGES) {
      await loadingTask.destroy()
      throw new PassportScanError('PDF_TOO_MANY_PAGES')
    }

    const page = await pdfDocument.getPage(1)
    const baseViewport = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: PDF_RENDER_WIDTH / baseViewport.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new PassportScanError('PDF_INVALID')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PDF canvas export failed')), 'image/jpeg', 0.92))
    page.cleanup()
    await loadingTask.destroy()
    return { image: new File([blob], `${file.name.replace(/\.pdf$/i, '')}-page-1.jpg`, { type: 'image/jpeg' }), pageCount }
  } catch (reason) {
    if (reason instanceof PassportScanError) throw reason
    const name = reason instanceof Error ? reason.name : ''
    if (name === 'PasswordException') throw new PassportScanError('PDF_PASSWORD_PROTECTED', { cause: reason })
    throw new PassportScanError('PDF_INVALID', { cause: reason })
  }
}
