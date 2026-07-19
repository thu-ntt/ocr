import type {
  FieldConfidence,
  PassportData,
  PassportEvidence,
  PassportField,
  PassportFieldEvidence,
  PassportFieldSource,
} from '../types/passport'
import { PASSPORT_FIELD_SOURCE } from '../types/passport'
import { EMPTY_PASSPORT } from '../utils/passport'

const MRZ_FIELDS: ReadonlySet<PassportField> = new Set([
  'passportNumber',
  'surname',
  'givenName',
  'nationality',
  'gender',
  'dateOfBirth',
  'expiryDate',
])

const CONFIDENCE = {
  validMrz: 0.99,
  invalidMrz: 0.7,
  visualInferenceMaximum: 0.6,
  derivedMaximum: 0.9,
} as const

interface EvidenceContext {
  data: PassportData
  mrzData: Partial<PassportData>
  visualData: Partial<PassportData>
  averageConfidence: number
  mrzValid: boolean
  issueDateWasInferred: boolean
}

function latestValue<Field extends PassportField>(
  field: Field,
  sources: ReadonlyArray<Partial<PassportData>>,
): PassportData[Field] {
  return sources.reduce<PassportData[Field]>(
    (current, source) => source[field] || current,
    EMPTY_PASSPORT[field],
  )
}

export function mergePassportData(
  ...sources: ReadonlyArray<Partial<PassportData>>
): PassportData {
  return {
    passportNumber: latestValue('passportNumber', sources),
    surname: latestValue('surname', sources),
    givenName: latestValue('givenName', sources),
    fullName: latestValue('fullName', sources),
    nationality: latestValue('nationality', sources),
    gender: latestValue('gender', sources),
    dateOfBirth: latestValue('dateOfBirth', sources),
    issueDate: latestValue('issueDate', sources),
    expiryDate: latestValue('expiryDate', sources),
  }
}

function fieldSource(
  field: PassportField,
  context: EvidenceContext,
): PassportFieldSource {
  if (!context.data[field]) return PASSPORT_FIELD_SOURCE.MISSING
  if (field === 'fullName') return PASSPORT_FIELD_SOURCE.DERIVED
  if (MRZ_FIELDS.has(field) && context.mrzData[field]) {
    return PASSPORT_FIELD_SOURCE.MRZ
  }
  if (field === 'issueDate' && context.issueDateWasInferred) {
    return PASSPORT_FIELD_SOURCE.VISUAL_INFERENCE
  }
  if (context.visualData[field]) return PASSPORT_FIELD_SOURCE.VISUAL_LABEL
  return PASSPORT_FIELD_SOURCE.VISUAL_INFERENCE
}

function sourceConfidence(
  source: PassportFieldSource,
  context: EvidenceContext,
): number {
  switch (source) {
    case PASSPORT_FIELD_SOURCE.MRZ:
      return context.mrzValid ? CONFIDENCE.validMrz : CONFIDENCE.invalidMrz
    case PASSPORT_FIELD_SOURCE.VISUAL_LABEL:
      return context.averageConfidence
    case PASSPORT_FIELD_SOURCE.VISUAL_INFERENCE:
      return Math.min(context.averageConfidence, CONFIDENCE.visualInferenceMaximum)
    case PASSPORT_FIELD_SOURCE.DERIVED:
      return Math.min(context.averageConfidence, CONFIDENCE.derivedMaximum)
    case PASSPORT_FIELD_SOURCE.MISSING:
      return 0
  }
}

function evidenceFor<Field extends PassportField>(
  field: Field,
  context: EvidenceContext,
): PassportFieldEvidence<PassportData[Field]> {
  const source = fieldSource(field, context)
  return {
    value: context.data[field],
    source,
    confidence: sourceConfidence(source, context),
  }
}

export function createPassportEvidence(context: EvidenceContext): PassportEvidence {
  return {
    passportNumber: evidenceFor('passportNumber', context),
    surname: evidenceFor('surname', context),
    givenName: evidenceFor('givenName', context),
    fullName: evidenceFor('fullName', context),
    nationality: evidenceFor('nationality', context),
    gender: evidenceFor('gender', context),
    dateOfBirth: evidenceFor('dateOfBirth', context),
    issueDate: evidenceFor('issueDate', context),
    expiryDate: evidenceFor('expiryDate', context),
  }
}

export function confidenceFromEvidence(evidence: PassportEvidence): FieldConfidence {
  return {
    passportNumber: evidence.passportNumber.confidence,
    surname: evidence.surname.confidence,
    givenName: evidence.givenName.confidence,
    fullName: evidence.fullName.confidence,
    nationality: evidence.nationality.confidence,
    gender: evidence.gender.confidence,
    dateOfBirth: evidence.dateOfBirth.confidence,
    issueDate: evidence.issueDate.confidence,
    expiryDate: evidence.expiryDate.confidence,
  }
}
