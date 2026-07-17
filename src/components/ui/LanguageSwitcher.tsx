import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '../../i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'vi'
  return <label className="language-switcher"><Languages size={15} /><span>{t('common.language')}</span><select aria-label={t('common.language')} value={language} onChange={(event) => setLanguage(event.target.value as 'vi' | 'en')}><option value="vi">VI</option><option value="en">EN</option></select></label>
}
