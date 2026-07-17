import { RotateCcw, ScanLine, Trash2 } from 'lucide-react'
import type { OCRStatus } from '../../types/passport'
import { BUSY_OCR_STATUSES } from '../../config/ocr'
import { useTranslation } from 'react-i18next'

export function PassportPreview({ url, name, status, onScan, onReset }: { url: string; name: string; status: OCRStatus; onScan: () => void; onReset: () => void }) {
  const busy = BUSY_OCR_STATUSES.has(status)
  const { t } = useTranslation()
  return (
    <div className="preview-wrap">
      <div className="preview-toolbar"><span>{name}</span><button className="delete-image" type="button" onClick={onReset} aria-label={t('preview.deleteAria')}><Trash2 size={15} /><b>{t('preview.delete')}</b></button></div>
      <div className="preview-frame"><img src={url} alt={t('preview.alt')} />{busy ? <div className="scan-beam" /> : null}</div>
      <div className="preview-actions">
        <button className="button primary wide" type="button" onClick={onScan} disabled={busy}><ScanLine size={18} />{busy ? t('preview.processing') : status === 'complete' ? t('preview.scanAgain') : t('preview.scan')}</button>
        {status === 'complete' ? <button className="button ghost" type="button" onClick={onScan}><RotateCcw size={16} /> {t('common.retry')}</button> : null}
      </div>
    </div>
  )
}
