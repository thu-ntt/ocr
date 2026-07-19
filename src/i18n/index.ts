import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { vi } from './locales/vi'
import { SUPPORTED_LANGUAGE, type SupportedLanguage } from './types'

const LANGUAGE_STORAGE_KEY = 'passport-ocr-language'

function storedLanguage(): SupportedLanguage {
  const language = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return language === SUPPORTED_LANGUAGE.VIETNAMESE
    ? SUPPORTED_LANGUAGE.VIETNAMESE
    : SUPPORTED_LANGUAGE.ENGLISH
}

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: storedLanguage(),
  fallbackLng: SUPPORTED_LANGUAGE.ENGLISH,
  interpolation: { escapeValue: false },
})

export function setLanguage(language: SupportedLanguage) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  void i18n.changeLanguage(language)
}

export default i18n
