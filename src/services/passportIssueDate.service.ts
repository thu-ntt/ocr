import type { PassportData } from '../types/passport'
import { findDatesInText } from '../utils/passport'

function isValidIssueDate(date: string, passport: PassportData): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return Boolean(date) &&
    date !== passport.dateOfBirth &&
    date !== passport.expiryDate &&
    (!passport.dateOfBirth || date > passport.dateOfBirth) &&
    (!passport.expiryDate || date < passport.expiryDate) &&
    date <= today
}

function inferIssueDate(rawText: string, passport: PassportData): string {
  return findDatesInText(rawText)
    .filter((date) => isValidIssueDate(date, passport))
    .sort()
    .at(-1) ?? ''
}

/** TD3 has no issue date, so a valid printed date is used after ICAO parsing. */
export function resolvePassportIssueDate(
  rawText: string,
  passport: PassportData,
  labelledDate: string,
): string {
  return isValidIssueDate(labelledDate, passport)
    ? labelledDate
    : inferIssueDate(rawText, passport)
}
