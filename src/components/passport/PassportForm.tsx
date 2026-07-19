import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { PassportExtraction } from '../../types/passport'
import { EMPTY_PASSPORT } from '../../utils/passport'
import { createPassportSchema, type PassportFormValues } from '../../services/validation.service'
import { useTranslation } from 'react-i18next'
import { PassportFormFields } from './PassportFormFields'
import { PassportFormActions } from './PassportFormActions'

interface PassportFormProps {
  result: PassportExtraction | null
  isLoading: boolean
  onSubmit?: (data: PassportFormValues) => Promise<void> | void
}

export function PassportForm({ result, isLoading, onSubmit }: PassportFormProps) {
  const { t } = useTranslation()
  const passportSchema = useMemo(() => createPassportSchema(t), [t])
  const { control, register, reset, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<PassportFormValues>({
    resolver: zodResolver(passportSchema), mode: 'onSubmit', reValidateMode: 'onBlur', defaultValues: EMPTY_PASSPORT,
  })
  useEffect(() => {
    reset(result?.data ?? EMPTY_PASSPORT, { keepDefaultValues: true })
  }, [result, reset])
  const submit = async (data: PassportFormValues) => {
    const fullName = `${data.surname} ${data.givenName}`.replace(/\s+/g, ' ').trim()
    await onSubmit?.(passportSchema.parse({ ...data, fullName }))
  }
  return <form onSubmit={handleSubmit(submit)} className={`passport-form ${isLoading ? 'is-loading' : ''}`} aria-busy={isLoading} noValidate>
    <div className="section-heading"><div><h2>{t('form.title')}</h2><p>{t('form.description')}</p></div>{result ? <span className="filled-badge"><Check size={14} /> {t('form.autoFilled')}</span> : null}</div>
    <fieldset className="passport-fields" disabled={isLoading}>
      <PassportFormFields control={control} register={register} errors={errors} />
    </fieldset>
    <PassportFormActions hasResult={Boolean(result)} isSubmitting={isSubmitting} isSubmitSuccessful={isSubmitSuccessful} />
  </form>
}
