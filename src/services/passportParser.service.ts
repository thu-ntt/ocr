import type { FieldConfidence, PassportData, PassportEvidence, PassportExtraction, PassportField, PassportFieldSource } from '../types/passport'
import { getVisualFieldRules, type VisualFieldRule } from '../config/passportProfiles'
import { EMPTY_PASSPORT, findDatesInText, normalizeDate } from '../utils/passport'
import { detectMachineReadableDocumentType, findMrzLines, parseMrz } from './mrz.service'
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
    // PaddleOCR frequently emits the bilingual label and date tokens as
    // separate lines. Test short adjacent windows instead of document-specific
    // layouts or country-specific date strings.
    const nearbyLines = lines.slice(index, index + 8)
    for (let offset = 0; offset < nearbyLines.length; offset += 1) {
      for (let size = 1; size <= 3 && offset + size <= nearbyLines.length; size += 1) {
        const candidate = nearbyLines.slice(offset, offset + size).join(' ').replace(labelPattern, '')
        const parsed = normalizeDate(candidate)
        if (parsed) return parsed
      }
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
  if (extracted.passportNumber) {
    const token = extracted.passportNumber.trim().split(/\s/)[0]?.toUpperCase() ?? ''
    extracted.passportNumber = /^[A-Z0-9]{6,12}$/.test(token) ? token : ''
  }
  if (extracted.surname) extracted.surname = sanitizeVisualName(extracted.surname)
  if (extracted.givenName) extracted.givenName = sanitizeVisualName(extracted.givenName)
  if (extracted.nationality) {
    const token = extracted.nationality.trim().split(/\s/)[0]?.toUpperCase() ?? ''
    extracted.nationality = /^[A-Z]{3}$/.test(token) ? token : ''
  }
  return extracted
}

const EMBEDDED_LABEL = /\b(?:GIVEN\s*NAMES?|SURNAME|NATIONALITY|DATE\s*OF|SEX|PASSPORT|DOCUMENT)\b/i

function sanitizeVisualName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase()
  if (!normalized || normalized.length > 60 || EMBEDDED_LABEL.test(normalized)) return ''
  return /^[\p{L}][\p{L} '\u2019-]*$/u.test(normalized) ? normalized : ''
}

function mergeNonEmpty(...sources: ReadonlyArray<Partial<PassportData>>): PassportData {
  const result: PassportData = { ...EMPTY_PASSPORT }
  for (const source of sources) {
    for (const field of Object.keys(source) as PassportField[]) {
      const value = source[field]
      if (value) result[field] = value as never
    }
  }
  return result
}

const MRZ_FIELDS = new Set<PassportField>([
  'passportNumber', 'surname', 'givenName', 'fullName', 'nationality',
  'gender', 'dateOfBirth', 'expiryDate',
])

function fieldSource(
  field: PassportField,
  value: PassportData[PassportField],
  mrzData: Partial<PassportData>,
  visualData: Partial<PassportData>,
  issueDateWasInferred: boolean,
): PassportFieldSource {
  if (!value) return 'missing'
  if (MRZ_FIELDS.has(field) && mrzData[field]) return 'mrz'
  if (field === 'issueDate' && issueDateWasInferred) return 'visual-inference'
  if (visualData[field]) return 'visual-label'
  if (field === 'fullName') return 'derived'
  return 'visual-inference'
}

function sourceConfidence(source: PassportFieldSource, averageConfidence: number, mrzValid: boolean): number {
  switch (source) {
    case 'mrz': return mrzValid ? 0.99 : 0.7
    case 'visual-label': return averageConfidence
    case 'visual-inference': return Math.min(averageConfidence, 0.6)
    case 'derived': return Math.min(averageConfidence, 0.9)
    case 'missing': return 0
  }
}

function buildEvidence(
  data: PassportData,
  mrzData: Partial<PassportData>,
  visualData: Partial<PassportData>,
  averageConfidence: number,
  mrzValid: boolean,
  issueDateWasInferred: boolean,
): PassportEvidence {
  return (Object.keys(data) as PassportField[]).reduce<PassportEvidence>((evidence, field) => {
    const source = fieldSource(field, data[field], mrzData, visualData, issueDateWasInferred)
    evidence[field] = { value: data[field] as never, source, confidence: sourceConfidence(source, averageConfidence, mrzValid) } as never
    return evidence
  }, {} as PassportEvidence)
}

function assertPassport(rawText: string, mrz: string[], visual: Partial<PassportData>): void {
  const documentType = detectMachineReadableDocumentType(rawText)
  const hasVisaHeading = /\b(?:ENTRY\s+VISA|VISA)\b/i.test(rawText)
  if (documentType === 'visa' || documentType === 'other' || hasVisaHeading) {
    throw new PassportScanError('NOT_PASSPORT')
  }
  const passportSignals = [/\bPASSPORT\b/i, /PASSEPORT/i, /护照/, /旅券/, /HỘ CHIẾU/i].filter((pattern) => pattern.test(rawText)).length
  const extractedSignals = [visual.passportNumber, visual.surname, visual.nationality].filter(Boolean).length
  if (mrz.length !== 2 && passportSignals + extractedSignals < 2) throw new PassportScanError('NOT_PASSPORT')
}

export function parsePassportText(rawText: string, averageConfidence = 0, metrics?: PassportExtraction['metrics']): PassportExtraction {
  const mrz = findMrzLines(rawText)
  const parsedMrz = parseMrz(mrz)
  const commonVisual = parseVisualZone(rawText)
  assertPassport(rawText, mrz, commonVisual)
  const countryVisual = parseVisualZone(rawText, parsedMrz.data.nationality)
  const visual = mergeNonEmpty(commonVisual, countryVisual)
  const merged = mergeNonEmpty(visual, parsedMrz.data)
  merged.fullName ||= `${merged.surname} ${merged.givenName}`.trim()
  const issueDateWasInferred = !merged.issueDate
  if (issueDateWasInferred) merged.issueDate = inferIssueDate(rawText, merged)
  const evidence = buildEvidence(merged, parsedMrz.data, visual, averageConfidence, parsedMrz.valid, issueDateWasInferred)
  const confidence = Object.keys(merged).reduce<FieldConfidence>((result, key) => {
    result[key as PassportField] = evidence[key as PassportField].confidence
    return result
  }, {})
  return {
    data: merged, confidence, evidence, rawText, mrz, warnings: parsedMrz.warnings, isMrzValid: parsedMrz.valid,
    metrics: metrics ?? { detectionMs: 0, recognitionMs: 0, totalMs: 0, detectedBoxes: 0, recognizedLines: 0, backend: 'unknown' },
  }
}
