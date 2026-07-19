import type { PassportData } from '../types/passport'

function words(value: string): string[] {
  return value.trim().toUpperCase().split(/\s+/).filter(Boolean)
}

function withoutSequence(source: string[], sequence: string[]): string[] {
  if (!sequence.length) return source

  for (let index = 0; index <= source.length - sequence.length; index += 1) {
    const matches = sequence.every((word, offset) => source[index + offset] === word)
    if (matches) return [...source.slice(0, index), ...source.slice(index + sequence.length)]
  }
  return source
}

function sameCharacters(left: string, right: string): boolean {
  return left.replace(/\s/g, '') === right.replace(/\s/g, '')
}

/** Uses VIZ only to restore spaces omitted by OCR; MRZ characters stay authoritative. */
export function restoreMrzNameSpacing(
  mrzData: Partial<PassportData>,
  visualData: Partial<PassportData>,
): Partial<PassportData> {
  const surname = mrzData.surname ?? ''
  const mrzGivenName = mrzData.givenName ?? ''
  const visualFullName = visualData.fullName ?? ''
  if (!surname || !mrzGivenName || !visualFullName) return mrzData

  const visualGivenName = withoutSequence(words(visualFullName), words(surname)).join(' ')
  if (!visualGivenName || !sameCharacters(visualGivenName, mrzGivenName)) return mrzData

  return {
    ...mrzData,
    givenName: visualGivenName,
    fullName: `${surname} ${visualGivenName}`,
  }
}
