import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { vi } from './locales/vi'

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: localStorage.getItem('passport-ocr-language') || 'vi',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(language: 'vi' | 'en') {
  localStorage.setItem('passport-ocr-language', language)
  void i18n.changeLanguage(language)
}

export default i18n
