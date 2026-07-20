import { COUNTRIES, type Country } from '../constants/countries'

export interface NationalityOption {
  code: string
  name: string
}

const normalizeName = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')

const COUNTRY_LIST: readonly Country[] = COUNTRIES

const countrySearchValues = COUNTRY_LIST.map((country) => ({
  country,
  values: [
    country.alpha2,
    country.alpha3,
    country.numeric,
    country.name,
    country.nameVi,
    country.commonName,
    country.officialName,
  ].filter(Boolean).map((value) => normalizeName(value ?? '')),
}))

export const NATIONALITY_CODES: ReadonlySet<string> = new Set(
  COUNTRY_LIST.map(({ alpha3 }) => alpha3),
)

export function getNationalityOptions(language: string): NationalityOption[] {
  const useVietnameseNames = language.startsWith('vi')
  return COUNTRY_LIST
    .map((country) => ({
      code: country.alpha3,
      name: useVietnameseNames ? country.nameVi : country.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, language))
}

/** Resolves OCR text containing an ISO alpha-2, alpha-3, numeric code or name. */
export function resolveNationalityCode(value: string): string {
  const normalizedValue = normalizeName(value)
  if (!normalizedValue) return ''

  const exactMatch = countrySearchValues.find(({ values }) =>
    values.includes(normalizedValue),
  )
  if (exactMatch) return exactMatch.country.alpha3

  const tokenMatch = countrySearchValues.find(({ country }) => {
    const codes = [country.alpha2, country.alpha3, country.numeric]
    return codes.some((code) => new RegExp(`(?:^|[^A-Z0-9])${code}(?:$|[^A-Z0-9])`, 'i').test(value))
  })
  return tokenMatch?.country.alpha3 ?? ''
}

export function findCountry(code: string): Country | undefined {
  return COUNTRY_LIST.find(({ alpha3 }) => alpha3 === code)
}
