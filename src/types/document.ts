export type SupportedDocumentKind = 'image' | 'pdf'

export interface PreparedDocument {
  originalFile: File
  ocrFile: File
  kind: SupportedDocumentKind
  pageCount: number
}
