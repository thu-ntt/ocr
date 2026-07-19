import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PassportFormActionsProps {
  hasResult: boolean
  isSubmitting: boolean
  isSubmitSuccessful: boolean
}

export function PassportFormActions({ hasResult, isSubmitting, isSubmitSuccessful }: PassportFormActionsProps) {
  const { t } = useTranslation()
  const submitLabel = isSubmitSuccessful
    ? t('form.confirmed')
    : isSubmitting
      ? t('form.saving')
      : t('form.submit')

  return <div className="form-footer">
    <p>{hasResult ? t('form.reviewHint') : t('form.emptyHint')}</p>
    <button className="button primary" type="submit" disabled={!hasResult || isSubmitting}>
      <Send size={17} />{submitLabel}
    </button>
  </div>
}
