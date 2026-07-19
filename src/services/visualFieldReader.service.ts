import { PASSPORT_PARSING_CONFIG } from '../config/passportParsing'
import { normalizeDate } from '../utils/passport'
import { containsSimilarPhrase } from '../utils/fuzzyText'

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function consecutiveText(lines: readonly string[]): string[] {
  const candidates: string[] = []
  for (let start = 0; start < lines.length; start += 1) {
    for (
      let length = 1;
      length <= PASSPORT_PARSING_CONFIG.dateValueMaxLines && start + length <= lines.length;
      length += 1
    ) {
      candidates.push(lines.slice(start, start + length).join(' '))
    }
  }
  return candidates
}

export function readTextAfterLabel(text: string, labels: readonly string[]): string {
  const match = text.match(
    new RegExp(`(?:${labels.join('|')})\\s*[:：]?\\s*([^\\n]+)`, 'i'),
  )
  return match?.[1]?.trim() ?? ''
}

export function readDateNearLabel(text: string, labels: readonly string[]): string {
  const lines = nonEmptyLines(text)
  const labelIndex = lines.findIndex((line) => labels.some((label) =>
    containsSimilarPhrase(
      line,
      label,
      PASSPORT_PARSING_CONFIG.ocrLabelSimilarity,
    ),
  ))
  if (labelIndex < 0) return ''

  const dateSection = lines
    .slice(labelIndex, labelIndex + PASSPORT_PARSING_CONFIG.dateValueMaxLines)

  for (const textCandidate of consecutiveText(dateSection)) {
    const date = normalizeDate(textCandidate)
    if (date) return date
  }
  return ''
}
