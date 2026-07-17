import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Send, Sparkles } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { PassportExtraction } from '../../types/passport'
import { passportFormFields } from '../../utils/mapper'
import { EMPTY_PASSPORT } from '../../utils/passport'
import { createPassportSchema, type PassportFormValues } from '../../services/validation.service'
import { useTranslation } from 'react-i18next'

interface PassportFormProps {
  result: PassportExtraction | null
  onSubmit?: (data: PassportFormValues) => Promise<void> | void
}

export function PassportForm({ result, onSubmit }: PassportFormProps) {
  const { t } = useTranslation()
  const passportSchema = useMemo(() => createPassportSchema(t), [t])
  const { register, reset, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<PassportFormValues>({
    resolver: zodResolver(passportSchema), mode: 'onSubmit', reValidateMode: 'onBlur', defaultValues: EMPTY_PASSPORT,
  })
  useEffect(() => {
    reset(result?.data ?? EMPTY_PASSPORT, { keepDefaultValues: true })
  }, [result, reset])
  const submit = async (data: PassportFormValues) => { await onSubmit?.(passportSchema.parse(data)) }
  return <form onSubmit={handleSubmit(submit)} className="passport-form" noValidate>
    <div className="section-heading"><div><span className="eyebrow"><Sparkles size={14} /> {t('form.eyebrow')}</span><h2>{t('form.title')}</h2><p>{t('form.description')}</p></div>{result ? <span className="filled-badge"><Check size={14} /> {t('form.autoFilled')}</span> : null}</div>
    <div className="form-grid">{passportFormFields.map((field) => <label className={`field ${field.name === 'fullName' ? 'span-2' : ''}`} key={field.name}><span>{t(`fields.${field.name}`)}</span><input type={field.type ?? 'text'} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.name])} {...register(field.name)} />{errors[field.name]?.message ? <small>{errors[field.name]?.message}</small> : null}</label>)}</div>
    <div className="form-footer"><p>{result ? t('form.reviewHint') : t('form.emptyHint')}</p><button className="button primary" type="submit" disabled={!result || isSubmitting}><Send size={17} />{isSubmitSuccessful ? t('form.confirmed') : isSubmitting ? t('form.saving') : t('form.submit')}</button></div>
  </form>
}
