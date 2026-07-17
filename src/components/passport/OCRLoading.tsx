import { BrainCircuit, FileSearch, ScanText } from 'lucide-react'
import type { OCRStatus } from '../../types/passport'
import { useTranslation } from 'react-i18next'

const stages = [
  { status: 'preparing', label: 'progress.preparing', icon: BrainCircuit },
  { status: 'recognizing', label: 'progress.recognizing', icon: ScanText },
  { status: 'parsing', label: 'progress.parsing', icon: FileSearch },
] as const

export function OCRLoading({ status }: { status: OCRStatus }) {
  const { t } = useTranslation()
  const current = stages.findIndex((stage) => stage.status === status)
  return <div className="ocr-progress" role="status"><div className="progress-head"><span>{t('progress.title')}</span><span>{Math.max(1, current + 1)}/3</span></div><div className="stage-list">{stages.map((stage, index) => { const Icon = stage.icon; return <div className={`stage ${index <= current ? 'active' : ''}`} key={stage.status}><Icon size={16} /><span>{t(stage.label)}</span></div> })}</div></div>
}
