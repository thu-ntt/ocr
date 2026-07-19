import {
  PASSPORT_DATE_CONFIG,
  PASSPORT_MONTH_ALIASES,
} from '../config/passportDates'

const OCR_NUMBER = '[0-9OQDILZSB]'
const DAY = `(${OCR_NUMBER}{1,2})`
const YEAR = `(${OCR_NUMBER}{4}|${OCR_NUMBER}{2})`
const MONTH_NAME = '([A-Z]{3,9})'

const DATE_PATTERNS = {
  eastAsian: new RegExp(`(${OCR_NUMBER}{4})\\s*年\\s*(${OCR_NUMBER}{1,2})\\s*月\\s*(${OCR_NUMBER}{1,2})\\s*日?`),
  yearFirst: new RegExp(`(${OCR_NUMBER}{4})[./-](${OCR_NUMBER}{1,2})[./-](${OCR_NUMBER}{1,2})`),
  numeric: new RegExp(`${DAY}[./-](${OCR_NUMBER}{1,2})[./-]${YEAR}`),
  slashNamed: new RegExp(`${DAY}[ .-]*([A-Z]{2,9})\\s*/\\s*([A-Z]{2,9})[ .-]*${YEAR}`),
  bilingualNamed: new RegExp(`${DAY}\\s+(?:${OCR_NUMBER}{1,2}\\s*月\\s*/\\s*)?${MONTH_NAME}(?:\\s*/\\s*[A-Z]{3,9})?\\s+${YEAR}`),
  named: new RegExp(`${DAY}[ ./-]*${MONTH_NAME}(?:\\s*/\\s*[A-Z]{3,9})?[ ./-]*${YEAR}`),
} as const

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[,|'’‘`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeOcrNumber(value: string): string {
  return value
    .replace(/[OQD]/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
}

function normalizeYear(value: string): number | null {
  const digits = normalizeOcrNumber(value)
  const year = digits.length === 2
    ? Number(`${Number(digits) > PASSPORT_DATE_CONFIG.twoDigitYearCutoff ? '19' : '20'}${digits}`)
    : Number(digits)

  if (year >= PASSPORT_DATE_CONFIG.minYear && year <= PASSPORT_DATE_CONFIG.maxYear) {
    return year
  }

  // Security backgrounds often corrupt the century while preserving YY.
  if (digits.length !== 4) return null
  return normalizeYear(digits.slice(-2))
}

function toIsoDate(dayValue: string, monthValue: string | number, yearValue: string): string {
  const day = Number(normalizeOcrNumber(dayValue))
  const month = typeof monthValue === 'number'
    ? monthValue
    : Number(normalizeOcrNumber(monthValue))
  const year = normalizeYear(yearValue)
  if (!year || !day || !month) return ''

  const isoDate = [year, month, day]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
    .join('-')
  const parsed = new Date(`${isoDate}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(isoDate)
    ? isoDate
    : ''
}

function monthNumber(value: string): number | null {
  return PASSPORT_MONTH_ALIASES[value] ?? null
}

function parseNamedDate(match: RegExpMatchArray | null): string {
  if (!match) return ''
  const month = monthNumber(match[2] ?? '')
  return month ? toIsoDate(match[1] ?? '', month, match[3] ?? '') : ''
}

function parseSlashNamedDate(match: RegExpMatchArray | null): string {
  if (!match) return ''
  const month = monthNumber(match[2] ?? '') ?? monthNumber(match[3] ?? '')
  return month ? toIsoDate(match[1] ?? '', month, match[4] ?? '') : ''
}

/** Converts common numeric, named, bilingual and East Asian VIZ dates to ISO. */
export function normalizePassportDate(value: string): string {
  const text = normalizeText(value)

  const eastAsian = text.match(DATE_PATTERNS.eastAsian)
  if (eastAsian) return toIsoDate(eastAsian[3] ?? '', eastAsian[2] ?? '', eastAsian[1] ?? '')

  const yearFirst = text.match(DATE_PATTERNS.yearFirst)
  if (yearFirst) return toIsoDate(yearFirst[3] ?? '', yearFirst[2] ?? '', yearFirst[1] ?? '')

  const slashNamed = parseSlashNamedDate(text.match(DATE_PATTERNS.slashNamed))
  if (slashNamed) return slashNamed

  const bilingualNamed = parseNamedDate(text.match(DATE_PATTERNS.bilingualNamed))
  if (bilingualNamed) return bilingualNamed

  const named = parseNamedDate(text.match(DATE_PATTERNS.named))
  if (named) return named

  const numeric = text.match(DATE_PATTERNS.numeric)
  return numeric
    ? toIsoDate(numeric[1] ?? '', numeric[2] ?? '', numeric[3] ?? '')
    : ''
}

export function findPassportDates(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const dates = new Set<string>()

  for (let index = 0; index < lines.length; index += 1) {
    for (
      let size = 1;
      size <= PASSPORT_DATE_CONFIG.scanWindowLines && index + size <= lines.length;
      size += 1
    ) {
      const date = normalizePassportDate(lines.slice(index, index + size).join(' '))
      if (date) dates.add(date)
    }
  }
  return [...dates]
}
