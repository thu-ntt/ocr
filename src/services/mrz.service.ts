import { parse, type FieldRecords } from 'mrz'
import type { Gender, PassportData } from '../types/passport'
import { mrzDate } from '../utils/passport'
import { PASSPORT_PARSING_CONFIG } from '../config/passportParsing'

export interface MrzParseResult {
  data: Partial<PassportData>
  valid: boolean
  warnings: string[]
}

const EMPTY_RESULT: MrzParseResult = {
  data: {},
  valid: false,
  warnings: ['The two-line ICAO TD3 MRZ was not found.'],
}

export const MACHINE_READABLE_DOCUMENT_TYPE = {
  PASSPORT: 'passport',
  VISA: 'visa',
  OTHER: 'other',
  UNKNOWN: 'unknown',
} as const

export type MachineReadableDocumentType =
  typeof MACHINE_READABLE_DOCUMENT_TYPE[keyof typeof MACHINE_READABLE_DOCUMENT_TYPE]

function restoreTrailingNameFillers(line: string): string {
  if (!line.trimStart().toUpperCase().startsWith('P')) return line

  const trailingArtifacts = new RegExp(
    `(?:\\s+[A-Z]){1,${PASSPORT_PARSING_CONFIG.maxTrailingFillerArtifacts}}(?=\\s*<*\\s*$)`,
    'i',
  )
  return line.replace(trailingArtifacts, (value) =>
    '<'.repeat(value.replace(/[^A-Z]/gi, '').length),
  )
}

function clearCharactersInsideNamePadding(line: string): string {
  const nameSeparatorIndex = line.indexOf('<<', 2)
  if (nameSeparatorIndex < 0) return line

  const fillerRun = '<'.repeat(PASSPORT_PARSING_CONFIG.trailingNameFillerRun)
  const paddingIndex = line.indexOf(fillerRun, nameSeparatorIndex + 2)
  if (paddingIndex < 0) return line

  return line.slice(0, paddingIndex) + line.slice(paddingIndex).replace(/[A-Z0-9]/g, '<')
}

function normalizeCandidate(rawLine: string): string {
  const normalized = restoreTrailingNameFillers(rawLine)
    .toUpperCase()
    // Angle-bracket lookalikes: « ‹ and caret-shaped characters (^, ∧, Λ)
    // that appear in Turkish passport MRZ fonts and some low-quality scans.
    .replace(/[«‹^∧Λ]/g, '<')
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9<]/g, '')
  const corrected = normalized.replace(/^P0(?=[A-Z]{3}.*<<)/, 'P<')

  return isTd3NameLine(corrected)
    ? clearCharactersInsideNamePadding(corrected)
    : corrected
}

function isCandidateLength(line: string): boolean {
  return Math.abs(
    line.length - PASSPORT_PARSING_CONFIG.td3LineLength,
  ) <= PASSPORT_PARSING_CONFIG.td3LengthTolerance
}

function isTd3NameLine(line: string): boolean {
  return /^P[A-Z<][A-Z]{3}/.test(line) && line.includes('<<')
}

function isTd3DataLine(line: string): boolean {
  return !isTd3NameLine(line) && /\d/.test(line)
}

export function detectMachineReadableDocumentType(rawText: string): MachineReadableDocumentType {
  const firstMrzLine = rawText
    .split(/\r?\n/)
    .map(normalizeCandidate)
    // Classification must be more tolerant than parsing. OCR may merge an MRZ
    // box with a neighbour or lose several fillers, but the document code and
    // repeated name fillers still identify a visa reliably.
    .find((line) =>
      line.length >= PASSPORT_PARSING_CONFIG.mrzCandidateMinLength &&
      line.length <= PASSPORT_PARSING_CONFIG.mrzCandidateMaxLength &&
      line.includes('<<'),
    )

  if (!firstMrzLine) return MACHINE_READABLE_DOCUMENT_TYPE.UNKNOWN
  if (firstMrzLine.startsWith('P')) return MACHINE_READABLE_DOCUMENT_TYPE.PASSPORT
  if (firstMrzLine.startsWith('V')) return MACHINE_READABLE_DOCUMENT_TYPE.VISA
  return MACHINE_READABLE_DOCUMENT_TYPE.OTHER
}

export function findMrzLines(rawText: string): string[] {
  const candidates = rawText
    .split(/\r?\n/)
    .map(normalizeCandidate)
    .filter(isCandidateLength)

  // ICAO TD3 line 1 starts with document code P and contains the holder name;
  // line 2 carries the fixed-position document data and normally has fewer
  // fillers. Pair by order instead of accepting the final two long OCR lines.
  for (let firstIndex = candidates.length - 2; firstIndex >= 0; firstIndex -= 1) {
    const first = candidates[firstIndex]
    if (!first || !isTd3NameLine(first)) continue
    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
      const second = candidates[secondIndex]
      if (!second || !isTd3DataLine(second)) continue
      return [first, second].map(toTd3Length)
    }
  }
  return []
}

function toTd3Length(line: string): string {
  return line
    .padEnd(PASSPORT_PARSING_CONFIG.td3LineLength, '<')
    .slice(0, PASSPORT_PARSING_CONFIG.td3LineLength)
}

function mapGender(value: string | null | undefined): Gender {
  if (value === 'male') return 'M'
  if (value === 'female') return 'F'
  return ''
}

function removeTrailingFillerArtifacts(name: string, isMrzValid: boolean): string {
  if (isMrzValid) return name

  const parts = name.trim().split(/\s+/)
  let artifactCount = 0
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (parts[index]?.length !== 1) break
    artifactCount += 1
  }
  if (artifactCount < 2 || artifactCount > PASSPORT_PARSING_CONFIG.maxTrailingFillerArtifacts) {
    return name
  }
  return parts.slice(0, -artifactCount).join(' ')
}

function readableName(value: string): string {
  return value.replace(/<+/g, ' ').trim()
}

function readTd3Names(
  nameLine: string,
  fields: FieldRecords,
  isMrzValid: boolean,
): { surname: string; givenName: string } {
  const nameField = nameLine.slice(5)
  const separatorIndex = nameField.indexOf('<<')
  if (separatorIndex < 0) {
    return {
      surname: fields.lastName ?? '',
      givenName: removeTrailingFillerArtifacts(fields.firstName ?? '', isMrzValid),
    }
  }

  const surname = readableName(nameField.slice(0, separatorIndex))
  const givenName = readableName(nameField.slice(separatorIndex + 2))
  return {
    surname: surname || fields.lastName || '',
    givenName: removeTrailingFillerArtifacts(
      givenName || fields.firstName || '',
      isMrzValid,
    ),
  }
}

function mapFields(
  fields: FieldRecords,
  documentNumber: string | null,
  isMrzValid: boolean,
  nameLine: string,
): Partial<PassportData> {
  const { surname, givenName } = readTd3Names(nameLine, fields, isMrzValid)
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
    if (result.format !== 'TD3') return { ...EMPTY_RESULT, warnings: [`${result.format} is not the ICAO TD3 passport format.`] }
    const warnings = result.details
      .filter((detail) => !detail.valid)
      .map((detail) => `${detail.label}: ${detail.error ?? 'invalid data'}`)
    return {
      data: mapFields(result.fields, result.documentNumber, result.valid, lines[0] ?? ''),
      valid: result.valid,
      warnings,
    }
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Invalid MRZ'
    return { ...EMPTY_RESULT, warnings: [message] }
  }
}
