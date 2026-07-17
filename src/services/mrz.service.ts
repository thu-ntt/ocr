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

function normalizeCandidate(line: string): string {
  return line.toUpperCase().replace(/\s/g, '').replace(/[«‹]/g, '<')
}

export function findMrzLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map(normalizeCandidate)
    .filter((line) => line.length >= 38 && line.includes('<'))
    .slice(-2)
    .map((line) => line.padEnd(44, '<').slice(0, 44))
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
