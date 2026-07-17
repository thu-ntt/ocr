import type { FieldConfidence, PassportData, PassportExtraction } from '../types/passport'
import { getVisualFieldRules, type VisualFieldRule } from '../config/passportProfiles'
import { EMPTY_PASSPORT, findDatesInText, normalizeDate } from '../utils/passport'
import { findMrzLines, parseMrz } from './mrz.service'
import { PassportScanError } from './passportScanError'

function labeled(text: string, labels: string[]): string {
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:：]?\\s*([^\\n]+)`, 'i')
  return text.match(pattern)?.[1]?.trim() ?? ''
}

function dateNearLabel(text: string, labels: string[]): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const labelPattern = new RegExp(`(?:${labels.join('|')})`, 'i')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || !labelPattern.test(line)) continue
    // PaddleOCR frequently emits the bilingual label and its value as separate lines.
    for (const candidate of lines.slice(index, index + 8)) {
      const parsed = normalizeDate(candidate.replace(labelPattern, ''))
      if (parsed) return parsed
    }
  }
  return ''
}

function inferIssueDate(rawText: string, passport: PassportData): string {
  const today = new Date().toISOString().slice(0, 10)
  const earliestIssueDate = passport.dateOfBirth
    ? `${Number(passport.dateOfBirth.slice(0, 4)) + 10}-01-01`
    : '1900-01-01'
  return findDatesInText(rawText)
    .filter((date) => date !== passport.dateOfBirth && date !== passport.expiryDate)
    .filter((date) => date >= earliestIssueDate && date <= today)
    .sort()
    .at(-1) ?? ''
}

function parseVisualField(text: string, rule: VisualFieldRule): string {
  const labels = [...rule.labels]
  return rule.strategy === 'date' ? dateNearLabel(text, labels) : labeled(text, labels)
}

function parseVisualZone(rawText: string, nationality?: string): Partial<PassportData> {
  const extracted: Partial<PassportData> = {}
  for (const rule of getVisualFieldRules(nationality)) extracted[rule.field] = parseVisualField(rawText, rule) as never
  if (extracted.passportNumber) extracted.passportNumber = extracted.passportNumber.replace(/\s/g, '').toUpperCase()
  if (extracted.surname) extracted.surname = extracted.surname.toUpperCase()
  if (extracted.givenName) extracted.givenName = extracted.givenName.toUpperCase()
  if (extracted.nationality) extracted.nationality = extracted.nationality.split(/\s/)[0]?.toUpperCase() ?? ''
  return extracted
}

function assertPassport(rawText: string, mrz: string[], visual: Partial<PassportData>): void {
  const passportSignals = [/\bPASSPORT\b/i, /PASSEPORT/i, /护照/, /旅券/, /HỘ CHIẾU/i].filter((pattern) => pattern.test(rawText)).length
  const extractedSignals = [visual.passportNumber, visual.surname, visual.nationality].filter(Boolean).length
  if (mrz.length !== 2 && passportSignals + extractedSignals < 2) throw new PassportScanError('NOT_PASSPORT')
  if (mrz.length !== 2) throw new PassportScanError('MRZ_NOT_FOUND')
}

export function parsePassportText(rawText: string, averageConfidence = 0, metrics?: PassportExtraction['metrics']): PassportExtraction {
  const mrz = findMrzLines(rawText)
  const parsedMrz = parseMrz(mrz)
  const commonVisual = parseVisualZone(rawText)
  assertPassport(rawText, mrz, commonVisual)
  const countryVisual = parseVisualZone(rawText, parsedMrz.data.nationality)
  const merged = { ...EMPTY_PASSPORT, ...commonVisual, ...countryVisual, ...parsedMrz.data }
  merged.fullName ||= `${merged.surname} ${merged.givenName}`.trim()
  merged.issueDate ||= inferIssueDate(rawText, merged)
  const confidence = Object.keys(merged).reduce<FieldConfidence>((result, key) => {
    result[key as keyof PassportData] = merged[key as keyof PassportData] ? averageConfidence : 0
    return result
  }, {})
  return {
    data: merged, confidence, rawText, mrz, warnings: parsedMrz.warnings, isMrzValid: parsedMrz.valid,
    metrics: metrics ?? { detectionMs: 0, recognitionMs: 0, totalMs: 0, detectedBoxes: 0, recognizedLines: 0, backend: 'unknown' },
  }
}
