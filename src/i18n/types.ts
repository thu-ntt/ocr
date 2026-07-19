import type { vi } from './locales/vi'

type StringShape<T> = {
  [Key in keyof T]: T[Key] extends string ? string : StringShape<T[Key]>
}

export type AppLocale = StringShape<typeof vi>

export const SUPPORTED_LANGUAGE = {
  VIETNAMESE: 'vi',
  ENGLISH: 'en',
} as const

export type SupportedLanguage = typeof SUPPORTED_LANGUAGE[keyof typeof SUPPORTED_LANGUAGE]
