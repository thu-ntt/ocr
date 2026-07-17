import type { PassportField } from '../types/passport'

export interface VisualFieldRule {
  field: PassportField
  labels: readonly string[]
  strategy: 'text' | 'date'
}

export interface PassportProfile {
  id: string
  countries: readonly string[]
  rules: readonly VisualFieldRule[]
  issueDateRegion?: NormalizedRegion
}

export interface NormalizedRegion { x: number; y: number; width: number; height: number }

const COMMON_RULES: readonly VisualFieldRule[] = [
  { field: 'passportNumber', strategy: 'text', labels: ['Passport No\\.?', 'Passport Number', 'Document No\\.?', 'N° du passeport'] },
  { field: 'surname', strategy: 'text', labels: ['Surname', 'Family name', 'Nom'] },
  { field: 'givenName', strategy: 'text', labels: ['Given names?', 'First names?', 'Prénoms?'] },
  { field: 'nationality', strategy: 'text', labels: ['Nationality', 'Nationalité'] },
  { field: 'issueDate', strategy: 'date', labels: [
    'Date of issue', 'Date of issuance', 'Issuing date', 'Issued on',
    'Date de délivrance', 'Délivré le', 'Fecha de Emisi[oó]n',
    'Fecha de expedici[oó]n', 'Data de emiss[aã]o',
  ] },
]

export const PASSPORT_PROFILES: readonly PassportProfile[] = [
  { id: 'icao-common', countries: ['*'], rules: COMMON_RULES },
  { id: 'vietnam', countries: ['VNM'], rules: [
    { field: 'passportNumber', strategy: 'text', labels: ['Số hộ chiếu'] },
    { field: 'surname', strategy: 'text', labels: ['Họ'] },
    { field: 'givenName', strategy: 'text', labels: ['Tên'] },
    { field: 'nationality', strategy: 'text', labels: ['Quốc tịch'] },
    { field: 'issueDate', strategy: 'date', labels: ['Ngày cấp', 'Ngay cap'] },
  ] },
  { id: 'japan', countries: ['JPN'], issueDateRegion: { x: 0.28, y: 0.42, width: 0.55, height: 0.34 }, rules: [
    { field: 'passportNumber', strategy: 'text', labels: ['旅券番号', 'Passport No\\.?'] },
    { field: 'surname', strategy: 'text', labels: ['姓', 'Surname'] },
    { field: 'givenName', strategy: 'text', labels: ['名', 'Given name'] },
    { field: 'issueDate', strategy: 'date', labels: ['発行年月日', 'Date of issue'] },
  ] },
  { id: 'china', countries: ['CHN'], rules: [
    { field: 'passportNumber', strategy: 'text', labels: ['护照号码', '护照号', 'Passport No\\.?'] },
    { field: 'surname', strategy: 'text', labels: ['姓', 'Surname'] },
    { field: 'givenName', strategy: 'text', labels: ['名', 'Given names?'] },
    { field: 'issueDate', strategy: 'date', labels: ['签发日期', 'Date of issue'] },
  ] },
]

export function getVisualFieldRules(nationality?: string): VisualFieldRule[] {
  const profiles = PASSPORT_PROFILES.filter((profile) => profile.countries.includes('*') || (nationality && profile.countries.includes(nationality)))
  const rulesByField = new Map<PassportField, VisualFieldRule>()
  for (const profile of profiles) {
    for (const rule of profile.rules) {
      const current = rulesByField.get(rule.field)
      rulesByField.set(rule.field, current ? { ...current, labels: [...current.labels, ...rule.labels] } : rule)
    }
  }
  return [...rulesByField.values()]
}

export function getIssueDateRegion(nationality?: string): NormalizedRegion | undefined {
  return PASSPORT_PROFILES.find((profile) => nationality && profile.countries.includes(nationality))?.issueDateRegion
}
