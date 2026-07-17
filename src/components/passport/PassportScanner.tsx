import { AlertCircle, FileSearch } from 'lucide-react'
import { usePassportOCR } from '../../hooks/usePassportOCR'
import { OCRLoading } from './OCRLoading'
import { PassportForm } from './PassportForm'
import { PassportPreview } from './PassportPreview'
import { PassportUpload } from './PassportUpload'
import { ValidationStatus } from './ValidationStatus'
import { BUSY_OCR_STATUSES } from '../../config/ocr'
import { useTranslation } from 'react-i18next'

export function PassportScanner() {
  const ocr = usePassportOCR()
  const { t } = useTranslation()
  const busy = BUSY_OCR_STATUSES.has(ocr.status)
  return <div className="workspace-grid">
    <section className="scanner-card"><div className="section-heading compact"><div><span className="step-number">01</span><h2>{t('scanner.title')}</h2><p>{t('scanner.hint')}</p></div></div>
      {ocr.file && ocr.previewUrl ? <PassportPreview url={ocr.previewUrl} name={ocr.file.name} status={ocr.status} onScan={ocr.scan} onReset={ocr.reset} /> : ocr.file && !ocr.error ? <div className="document-preparing"><FileSearch size={28} /><strong>{t('scanner.preparing')}</strong><span>{t('scanner.preparingHint')}</span></div> : ocr.file ? null : <PassportUpload onFile={ocr.setFile} />}
      {busy ? <OCRLoading status={ocr.status} /> : null}
      {ocr.error ? <div className="error-banner"><AlertCircle size={20} /><div><strong>{t('scanner.errorTitle')}</strong><p>{ocr.error}</p></div><button type="button" onClick={ocr.reset}>{t('common.chooseAnother')}</button></div> : null}
    </section>
    <section className="details-card">{ocr.result ? <ValidationStatus result={ocr.result} /> : null}<PassportForm result={ocr.result} /></section>
  </div>
}
