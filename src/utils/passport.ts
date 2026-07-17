export const EMPTY_PASSPORT = {
  passportNumber: '', surname: '', givenName: '', fullName: '', nationality: '', gender: '' as const,
  dateOfBirth: '', issueDate: '', expiryDate: '',
}

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  JANV: '01', FEV: '02', MARS: '03', AVR: '04', MAI: '05', JUIN: '06',
  JUIL: '07', AOUT: '08', SEPT: '09', OCTO: '10', NOVE: '11', DECE: '12',
}

function normalizeOcrMonth(value: string): string {
  return value.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B')
}

function toIsoDate(day: string, month: string, yearValue: string): string {
  const year = yearValue.length === 2 ? `${Number(yearValue) > 40 ? '19' : '20'}${yearValue}` : yearValue
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : ''
}

export function normalizeDate(value: string): string {
  const normalized = value.toUpperCase().replace(/[,|]/g, ' ').replace(/\s+/g, ' ').trim()
  const isoMatch = normalized.match(/\b(19\d{2}|20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/)
  if (isoMatch) return toIsoDate(isoMatch[3] ?? '', isoMatch[2] ?? '', isoMatch[1] ?? '')

  const numericMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/)
  if (numericMatch) return toIsoDate(numericMatch[1] ?? '', numericMatch[2] ?? '', numericMatch[3] ?? '')

  // OCR often removes spaces or confuses O/0 in values such as "15 OCT 2020".
  const namedMonthMatch = normalized.match(/\b(\d{1,2})[ .-]*([A-Z0-9]{3,5})(?:\s*\/\s*[A-Z0-9]{3,5})?[ .-]*(\d{2}|\d{4})\b/)
  if (namedMonthMatch) {
    const monthToken = normalizeOcrMonth(namedMonthMatch[2] ?? '').replace(/[^A-Z]/g, '')
    const month = MONTHS[monthToken]
    return month ? toIsoDate(namedMonthMatch[1] ?? '', month, namedMonthMatch[3] ?? '') : ''
  }
  return ''
}

export function findDatesInText(text: string): string[] {
  const dates = text.split(/\r?\n/).map(normalizeDate).filter(Boolean)
  return [...new Set(dates)]
}

export function mrzDate(value: string, kind: 'birth' | 'expiry'): string {
  if (!/^\d{6}$/.test(value)) return ''
  const yy = Number(value.slice(0, 2))
  const current = new Date().getFullYear() % 100
  const century = kind === 'birth' ? (yy > current ? 1900 : 2000) : (yy < 50 ? 2000 : 1900)
  return `${century + yy}-${value.slice(2, 4)}-${value.slice(4, 6)}`
}
