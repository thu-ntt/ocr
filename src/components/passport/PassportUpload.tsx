import { useDropzone } from 'react-dropzone'
import { ImagePlus, LockKeyhole, UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PassportUpload({ onFile }: { onFile: (file: File) => void }) {
  const { t } = useTranslation()
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'application/pdf': ['.pdf'] }, maxFiles: 1, maxSize: 12 * 1024 * 1024,
    onDropAccepted: (files) => { const file = files[0]; if (file) onFile(file) },
  })
  return (
    <div>
      <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'is-active' : ''}`}>
        <input {...getInputProps()} aria-label={t('upload.aria')} />
        <span className="upload-icon"><UploadCloud size={26} /></span>
        <h3>{isDragActive ? t('upload.drop') : t('upload.title')}</h3>
        <p>{t('upload.description')}</p>
        <button type="button" className="button secondary"><ImagePlus size={17} /> {t('upload.choose')}</button>
        <small>{t('upload.formats')}</small>
      </div>
      {fileRejections.length > 0 ? <p className="inline-error">{t('upload.rejected')}</p> : null}
      <p className="privacy-note"><LockKeyhole size={15} /> {t('upload.privacy')}</p>
    </div>
  )
}
