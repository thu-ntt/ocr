import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { PassportFormValues } from '../../services/validation.service'
import { NationalitySelect } from './NationalitySelect'

interface PassportFormFieldsProps {
  control: Control<PassportFormValues>
  register: UseFormRegister<PassportFormValues>
  errors: FieldErrors<PassportFormValues>
}

export function PassportFormFields({ control, register, errors }: PassportFormFieldsProps) {
  const { t } = useTranslation()

  return <div className="form-grid">
    <label className="field">
      <span>{t('fields.passportNumber')}</span>
      <input type="text" placeholder="C12345678" autoComplete="off" aria-invalid={Boolean(errors.passportNumber)} {...register('passportNumber')} />
      {errors.passportNumber?.message ? <small>{errors.passportNumber.message}</small> : null}
    </label>

    <label className="field">
      <span>{t('fields.surname')}</span>
      <input type="text" placeholder="NGUYEN" autoComplete="family-name" aria-invalid={Boolean(errors.surname)} {...register('surname')} />
      {errors.surname?.message ? <small>{errors.surname.message}</small> : null}
    </label>

    <label className="field">
      <span>{t('fields.givenName')}</span>
      <input type="text" placeholder="TIEN THU" autoComplete="given-name" aria-invalid={Boolean(errors.givenName)} {...register('givenName')} />
      {errors.givenName?.message ? <small>{errors.givenName.message}</small> : null}
    </label>

    <input type="hidden" {...register('fullName')} />

    <label className="field">
      <span>{t('fields.nationality')}</span>
      <NationalitySelect control={control} invalid={Boolean(errors.nationality)} />
      {errors.nationality?.message ? <small>{errors.nationality.message}</small> : null}
    </label>

    <label className="field">
      <span>{t('fields.gender')}</span>
      <select aria-invalid={Boolean(errors.gender)} {...register('gender')}>
        <option value="">{t('select.genderPlaceholder')}</option>
        <option value="M">{t('select.male')}</option>
        <option value="F">{t('select.female')}</option>
        <option value="X">{t('select.unspecified')}</option>
      </select>
      {errors.gender?.message ? <small>{errors.gender.message}</small> : null}
    </label>

    <label className="field">
      <span>{t('fields.dateOfBirth')}</span>
      <input type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...register('dateOfBirth')} />
      {errors.dateOfBirth?.message ? <small>{errors.dateOfBirth.message}</small> : null}
    </label>

    <label className="field">
      <span>{t('fields.issueDate')}</span>
      <input type="date" aria-invalid={Boolean(errors.issueDate)} {...register('issueDate')} />
      {errors.issueDate?.message ? <small>{errors.issueDate.message}</small> : null}
    </label>

    <label className="field">
      <span>{t('fields.expiryDate')}</span>
      <input type="date" aria-invalid={Boolean(errors.expiryDate)} {...register('expiryDate')} />
      {errors.expiryDate?.message ? <small>{errors.expiryDate.message}</small> : null}
    </label>
  </div>
}
