import 'i18next'
import type { AppLocale } from './types'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: AppLocale
    }
  }
}
