import { ImagePlus, LoaderCircle, ScanLine } from 'lucide-react'
import { OCR_STATUS, type OCRStatus } from '../../types/passport'
import { BUSY_OCR_STATUSES } from '../../config/ocr'
import { useTranslation } from 'react-i18next'
import { isAcceptedPassportFile, PASSPORT_IMAGE_ACCEPT } from '../../config/passportUpload'
import { useState, type DragEvent } from 'react'

interface PassportPreviewProps {
  url: string
  name: string
  status: OCRStatus
  onScan: () => void
  onFile: (file: File) => void
}

export function PassportPreview({ url, name, status, onScan, onFile }: PassportPreviewProps) {
  const busy = BUSY_OCR_STATUSES.has(status)
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)

  const selectFile = (file?: File) => {
    if (!busy && file && isAcceptedPassportFile(file)) onFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  return (
    <div className="preview-wrap">
      <div className="preview-toolbar">
        <span>{name}</span>
      </div>
      <label
        className={`preview-frame preview-file-picker ${isDragging ? 'is-active' : ''} ${busy ? 'is-busy' : ''}`}
        aria-label={t('preview.changeAria')}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!busy) setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false)
        }}
        onDrop={handleDrop}
      >
        <img src={url} alt={t('preview.alt')} />
        {!busy ? <span className="preview-change-hint"><ImagePlus size={16} />{t('preview.change')}</span> : null}
        {busy ? (
          <div className="preview-loading" role="status" aria-live="polite">
            <span className="preview-loading-icon" aria-hidden="true">
              <LoaderCircle size={28} strokeWidth={2.25} />
            </span>
            <span>{t('preview.processing')}</span>
          </div>
        ) : null}
        <input
          hidden
          disabled={busy}
          type="file"
          accept={PASSPORT_IMAGE_ACCEPT}
          aria-label={t('preview.changeAria')}
          onChange={(event) => {
            const file = event.target.files?.[0]
            selectFile(file)
            event.target.value = ''
          }}
        />
      </label>
      <div className="preview-actions">
        <button className="button primary wide" type="button" onClick={onScan} disabled={busy}><ScanLine size={18} />{busy ? t('preview.processing') : status === OCR_STATUS.COMPLETE ? t('preview.scanAgain') : t('preview.scan')}</button>
      </div>
    </div>
  )
}
