import { LockKeyhole, UploadCloud } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  isAcceptedPassportFile,
  PASSPORT_IMAGE_ACCEPT,
} from '../../config/passportUpload'

interface PassportUploadProps {
  onFile: (file: File) => void
}

export function PassportUpload({ onFile }: PassportUploadProps) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [hasError, setHasError] = useState(false)

  const selectFile = (file?: File) => {
    const accepted = file ? isAcceptedPassportFile(file) : false
    setHasError(!accepted)
    if (file && accepted) onFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  return <div>
    <label
      className={`upload-zone ${isDragging ? 'is-active' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false)
      }}
      onDrop={handleDrop}
    >
      <input
        hidden
        type="file"
        accept={PASSPORT_IMAGE_ACCEPT}
        aria-label={t('upload.aria')}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <span className="upload-icon"><UploadCloud size={26} /></span>
      <h3>{isDragging ? t('upload.drop') : t('upload.title')}</h3>
      <p>{t('upload.description')}</p>
      <span className="button secondary upload-cta">{t('upload.choose')}</span>
      <small>{t('upload.formats')}</small>
    </label>
    {hasError ? <p className="inline-error">{t('upload.rejected')}</p> : null}
    <p className="privacy-note"><LockKeyhole size={15} /> {t('upload.privacy')}</p>
  </div>
}
