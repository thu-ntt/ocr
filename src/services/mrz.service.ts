import { parse, type FieldRecords } from 'mrz'
import type { Gender, PassportData } from '../types/passport'
import { mrzDate } from '../utils/passport'

export interface MrzParseResult {
  data: Partial<PassportData>
  valid: boolean
  warnings: string[]
}

const EMPTY_RESULT: MrzParseResult = {
  data: {},
  valid: false,
  warnings: ['Không tìm thấy vùng MRZ TD3 gồm 2 dòng.'],
}

const TD3_LINE_LENGTH = 44
const TD3_LENGTH_TOLERANCE = 4

export type MachineReadableDocumentType = 'passport' | 'visa' | 'other' | 'unknown'

function normalizeCandidate(line: string): string {
  return line
    .toUpperCase()
    .replace(/[«‹]/g, '<')
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9<]/g, '')
}

export function detectMachineReadableDocumentType(rawText: string): MachineReadableDocumentType {
  const firstMrzLine = rawText
    .split(/\r?\n/)
    .map(normalizeCandidate)
    // Classification must be more tolerant than parsing. OCR may merge an MRZ
    // box with a neighbour or lose several fillers, but the document code and
    // repeated name fillers still identify a visa reliably.
    .find((line) => line.length >= 30 && line.length <= 60 && line.includes('<<'))

  if (!firstMrzLine) return 'unknown'
  if (firstMrzLine.startsWith('P')) return 'passport'
  if (firstMrzLine.startsWith('V')) return 'visa'
  return 'other'
}

export function findMrzLines(rawText: string): string[] {
  const candidates = rawText
    .split(/\r?\n/)
    .map(normalizeCandidate)
    .filter((line) => Math.abs(line.length - TD3_LINE_LENGTH) <= TD3_LENGTH_TOLERANCE)

  // ICAO TD3 line 1 starts with document code P and contains the holder name;
  // line 2 carries the fixed-position document data and normally has fewer
  // fillers. Pair by order instead of accepting the final two long OCR lines.
  for (let firstIndex = candidates.length - 2; firstIndex >= 0; firstIndex -= 1) {
    const first = candidates[firstIndex]
    if (!first?.startsWith('P') || !first.includes('<<')) continue
    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
      const second = candidates[secondIndex]
      if (!second || !/[0-9]/.test(second) || second.startsWith('P')) continue
      return [first, second].map(toTd3Length)
    }
  }
  return []
}

function toTd3Length(line: string): string {
  return line.padEnd(TD3_LINE_LENGTH, '<').slice(0, TD3_LINE_LENGTH)
}

function mapGender(value: string | null | undefined): Gender {
  if (value === 'male') return 'M'
  if (value === 'female') return 'F'
  return ''
}

function mapFields(fields: FieldRecords, documentNumber: string | null): Partial<PassportData> {
  const surname = fields.lastName ?? ''
  const givenName = fields.firstName ?? ''
  return {
    passportNumber: documentNumber ?? fields.documentNumber ?? '',
    surname,
    givenName,
    fullName: `${surname} ${givenName}`.trim(),
    nationality: fields.nationality ?? '',
    dateOfBirth: fields.birthDate ? mrzDate(fields.birthDate, 'birth') : '',
    gender: mapGender(fields.sex),
    expiryDate: fields.expirationDate ? mrzDate(fields.expirationDate, 'expiry') : '',
  }
}

export function parseMrz(lines: string[]): MrzParseResult {
  if (lines.length !== 2) return EMPTY_RESULT
  try {
    const result = parse(lines, { autocorrect: true })
    if (result.format !== 'TD3') return { ...EMPTY_RESULT, warnings: [`Định dạng ${result.format} không phải passport TD3.`] }
    const warnings = result.details
      .filter((detail) => !detail.valid)
      .map((detail) => `${detail.label}: ${detail.error ?? 'dữ liệu không hợp lệ'}`)
    return { data: mapFields(result.fields, result.documentNumber), valid: result.valid, warnings }
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'MRZ không hợp lệ'
    return { ...EMPTY_RESULT, warnings: [message] }
  }
}
