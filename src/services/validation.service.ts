import type { TFunction } from 'i18next'
import { z } from 'zod'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

export function createPassportSchema(t: TFunction) {
  const validIsoDate = z.string().regex(isoDate, t('formErrors.invalidDate')).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
  }, t('formErrors.nonexistentDate'))

  return z.object({
    passportNumber: z.string().trim().min(6, t('formErrors.passportMin')).max(12, t('formErrors.passportMax')).regex(/^[A-Z0-9]+$/i, t('formErrors.alphanumeric')),
    surname: z.string().trim().min(1, t('formErrors.surnameRequired')),
    givenName: z.string().trim().min(1, t('formErrors.givenNameRequired')),
    fullName: z.string().trim().min(2, t('formErrors.fullNameRequired')),
    nationality: z.string().trim().length(3, t('formErrors.nationalityLength')).transform((value) => value.toUpperCase()),
    gender: z.enum(['', 'M', 'F', 'X']).refine((value) => value !== '', t('formErrors.genderRequired')),
    dateOfBirth: validIsoDate.refine((value) => new Date(value) < new Date(), t('formErrors.birthPast')),
    issueDate: validIsoDate,
    expiryDate: validIsoDate.refine((value) => new Date(value) > new Date(), t('formErrors.expired')),
  }).superRefine((passport, context) => {
    if (passport.issueDate <= passport.dateOfBirth) context.addIssue({ code: 'custom', path: ['issueDate'], message: t('formErrors.issueAfterBirth') })
    if (passport.expiryDate <= passport.issueDate) context.addIssue({ code: 'custom', path: ['expiryDate'], message: t('formErrors.expiryAfterIssue') })
  })
}

export type PassportFormValues = z.input<ReturnType<typeof createPassportSchema>>
