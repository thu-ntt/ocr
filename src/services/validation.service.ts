import type { TFunction } from 'i18next'
import { z } from 'zod'
import { NATIONALITY_CODES } from '../config/nationalities'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRealIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createPassportSchema(t: TFunction) {
  const isoDate = z
    .string()
    .regex(ISO_DATE_PATTERN, t('formErrors.invalidDate'))
    .refine(isRealIsoDate, t('formErrors.nonexistentDate'))

  return z.object({
    passportNumber: z
      .string()
      .trim()
      .min(6, t('formErrors.passportMin'))
      .max(12, t('formErrors.passportMax'))
      .regex(/^[A-Z0-9]+$/i, t('formErrors.alphanumeric')),
    surname: z.string().trim().min(1, t('formErrors.surnameRequired')),
    givenName: z.string().trim().min(1, t('formErrors.givenNameRequired')),
    fullName: z.string().trim().min(2, t('formErrors.fullNameRequired')),
    nationality: z
      .string()
      .trim()
      .length(3, t('formErrors.nationalityLength'))
      .transform((value) => value.toUpperCase())
      .refine((value) => NATIONALITY_CODES.has(value), t('formErrors.nationalityInvalid')),
    gender: z
      .enum(['', 'M', 'F', 'X'])
      .refine(Boolean, t('formErrors.genderRequired')),
    dateOfBirth: isoDate.refine(
      (value) => value < today(),
      t('formErrors.birthPast'),
    ),
    issueDate: isoDate,
    expiryDate: isoDate.refine((value) => value > today(), t('formErrors.expired')),
  }).superRefine((passport, context) => {
    if (passport.issueDate <= passport.dateOfBirth) {
      context.addIssue({
        code: 'custom',
        path: ['issueDate'],
        message: t('formErrors.issueAfterBirth'),
      })
    }
    if (passport.expiryDate <= passport.issueDate) {
      context.addIssue({
        code: 'custom',
        path: ['expiryDate'],
        message: t('formErrors.expiryAfterIssue'),
      })
    }
  })
}

export type PassportFormValues = z.input<ReturnType<typeof createPassportSchema>>
