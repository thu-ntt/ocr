function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length] ?? right.length
}

function words(value: string): string[] {
  return value.toUpperCase().match(/[A-Z0-9]+/g) ?? []
}

function similarity(left: string, right: string): number {
  const longestLength = Math.max(left.length, right.length)
  return longestLength === 0
    ? 1
    : 1 - editDistance(left, right) / longestLength
}

/** Matches an OCR line against a phrase while tolerating character errors. */
export function containsSimilarPhrase(
  text: string,
  phrase: string,
  minimumSimilarity: number,
): boolean {
  const textWords = words(text)
  const phraseWords = words(phrase)
  if (textWords.length < phraseWords.length) return false

  return textWords.some((_, start) => {
    const candidate = textWords.slice(start, start + phraseWords.length).join(' ')
    return similarity(candidate, phraseWords.join(' ')) >= minimumSimilarity
  })
}
