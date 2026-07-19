import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { getNationalityOptions } from '../../config/nationalities'
import { PASSPORT_FORM_CONFIG } from '../../config/passportForm'
import type { PassportFormValues } from '../../services/validation.service'

interface NationalitySelectProps {
  control: Control<PassportFormValues>
  invalid: boolean
}

export function NationalitySelect({ control, invalid }: NationalitySelectProps) {
  const { i18n, t } = useTranslation()
  const { field: { value, onChange, onBlur } } = useController({ name: 'nationality', control })
  const containerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState<number>(
    PASSPORT_FORM_CONFIG.nationalityPageSize,
  )

  const options = useMemo(
    () => getNationalityOptions(i18n.language),
    [i18n.language],
  )
  const filteredOptions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(i18n.language)
    if (!search) return options
    return options.filter(({ code, name }) =>
      `${name} ${code}`.toLocaleLowerCase(i18n.language).includes(search),
    )
  }, [i18n.language, options, query])
  const selected = options.find(({ code }) => code === value)

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        onBlur()
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [onBlur])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!isOpen || !target) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisibleCount((count) => Math.min(
          count + PASSPORT_FORM_CONFIG.nationalityPageSize,
          filteredOptions.length,
        ))
      }
    }, { root: target.parentElement })
    observer.observe(target)
    return () => observer.disconnect()
  }, [filteredOptions.length, isOpen, visibleCount])

  const selectCountry = (code: string) => {
    onChange(code)
    onBlur()
    setQuery('')
    setIsOpen(false)
  }

  return <div className="country-select" ref={containerRef}>
    <button
      className="country-select-trigger"
      type="button"
      role="combobox"
      aria-expanded={isOpen}
      aria-controls="nationality-options"
      aria-invalid={invalid}
      onClick={() => setIsOpen((open) => !open)}
    >
      <span>{selected ? `${selected.name} (${selected.code})` : t('select.nationalityPlaceholder')}</span>
      <ChevronDown size={16} />
    </button>

    {isOpen ? <div className="country-select-dropdown">
      <div className="country-search">
        <Search size={15} />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setVisibleCount(PASSPORT_FORM_CONFIG.nationalityPageSize)
          }}
          placeholder={t('select.searchNationality')}
          aria-label={t('select.searchNationality')}
        />
      </div>
      <div className="country-options" id="nationality-options" role="listbox">
        {filteredOptions.slice(0, visibleCount).map(({ code, name }) => (
          <button
            className={code === value ? 'selected' : ''}
            type="button"
            role="option"
            aria-selected={code === value}
            key={code}
            onClick={() => selectCountry(code)}
          >
            <span>{name}</span><b>{code}</b>
          </button>
        ))}
        {filteredOptions.length === 0 ? <p>{t('select.noNationality')}</p> : null}
        <div className="country-load-more" ref={loadMoreRef} aria-hidden="true" />
      </div>
    </div> : null}
  </div>
}
