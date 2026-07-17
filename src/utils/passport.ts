export const EMPTY_PASSPORT = {
  passportNumber: '', surname: '', givenName: '', fullName: '', nationality: '', gender: '' as const,
  dateOfBirth: '', issueDate: '', expiryDate: '',
}

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  JANV: '01', FEV: '02', MARS: '03', AVR: '04', MAI: '05', JUIN: '06',
  JUIL: '07', AOUT: '08', SEPT: '09', OCTO: '10', NOVE: '11', DECE: '12',
  ENE: '01', ABR: '04', AGO: '08', DIC: '12',
  GEN: '01', MAG: '05', GIU: '06', LUG: '07', SET: '09', OTT: '10', DICEM: '12',
}

const MIN_PASSPORT_YEAR = 1900
const MAX_PASSPORT_YEAR = 2099
const TWO_DIGIT_CENTURY_CUTOFF = 40

function normalizeOcrMonth(value: string): string {
  return value.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B')
}

function normalizeOcrNumber(value: string): string {
  return value.replace(/[OQD]/g, '0').replace(/[IL]/g, '1').replace(/Z/g, '2').replace(/S/g, '5').replace(/B/g, '8')
}

function expandTwoDigitYear(value: string): string {
  return `${Number(value) > TWO_DIGIT_CENTURY_CUTOFF ? '19' : '20'}${value}`
}

/** Recovers OCR-corrupted centuries such as `8Q25` (intended `2025`). */
function normalizeOcrYear(value: string): string {
  const digits = normalizeOcrNumber(value)
  if (digits.length === 2) return expandTwoDigitYear(digits)
  if (digits.length !== 4) return ''

  const numericYear = Number(digits)
  if (numericYear >= MIN_PASSPORT_YEAR && numericYear <= MAX_PASSPORT_YEAR) return digits

  // The final two digits are usually clearer than the century on security
  // backgrounds. Recover only an impossible century; never alter a valid year.
  return expandTwoDigitYear(digits.slice(-2))
}

function toIsoDate(day: string, month: string, yearValue: string): string {
  const year = normalizeOcrYear(yearValue)
  if (!year) return ''
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : ''
}

export function normalizeDate(value: string): string {
  const normalized = value
    .toUpperCase()
    // Apostrophes are commonly used for abbreviated years (`NOV '19`) and
    // curly variants frequently appear in OCR output. They are separators,
    // not part of the year token.
    .replace(/[,|'’‘`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const isoMatch = normalized.match(/\b(19\d{2}|20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/)
  if (isoMatch) return toIsoDate(isoMatch[3] ?? '', isoMatch[2] ?? '', isoMatch[1] ?? '')

  const numericMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/)
  if (numericMatch) return toIsoDate(numericMatch[1] ?? '', numericMatch[2] ?? '', numericMatch[3] ?? '')

  // OCR often removes spaces or confuses O/0 in values such as "15 OCT 2020".
  const namedMonthMatch = normalized.match(/\b([0-9OQDILZSB]{1,2})[ .-]*([A-Z0-9]{3,5}?)(?:\s*\/\s*[A-Z0-9]{3,5})?[ .-]*([0-9OQDILZSB]{4}|[0-9OQDILZSB]{2})\b/)
  if (namedMonthMatch) {
    const monthToken = normalizeOcrMonth(namedMonthMatch[2] ?? '').replace(/[^A-Z]/g, '')
    const month = MONTHS[monthToken]
    const day = normalizeOcrNumber(namedMonthMatch[1] ?? '')
    const year = namedMonthMatch[3] ?? ''
    return month ? toIsoDate(day, month, year) : ''
  }
  return ''
}

export function findDatesInText(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const dates = new Set<string>()

  for (let index = 0; index < lines.length; index += 1) {
    // Detectors may emit day, month and year on adjacent rows. Sliding windows
    // support both that case and a normal single-line date without country rules.
    for (let size = 1; size <= 3 && index + size <= lines.length; size += 1) {
      const date = normalizeDate(lines.slice(index, index + size).join(' '))
      if (date) dates.add(date)
    }
  }
  return [...dates]
}

export function mrzDate(value: string, kind: 'birth' | 'expiry'): string {
  if (!/^\d{6}$/.test(value)) return ''
  const yy = Number(value.slice(0, 2))
  const current = new Date().getFullYear() % 100
  const century = kind === 'birth' ? (yy > current ? 1900 : 2000) : (yy < 50 ? 2000 : 1900)
  return `${century + yy}-${value.slice(2, 4)}-${value.slice(4, 6)}`
}
