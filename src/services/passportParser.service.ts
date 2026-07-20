import type { OCRMetrics, PassportExtraction } from '../types/passport'
import { findMrzLines, parseMrz } from './mrz.service'
import { assertPassportDocument, correctedNationality } from './passportDocument.service'
import {
  confidenceFromEvidence,
  createPassportEvidence,
  mergePassportData,
} from './passportEvidence.service'
import { resolvePassportIssueDate } from './passportIssueDate.service'
import { restoreMrzNameSpacing } from './passportName.service'
import { extractVisualPassportData } from './visualPassport.service'

const EMPTY_METRICS: OCRMetrics = {
  detectionMs: 0,
  recognitionMs: 0,
  totalMs: 0,
  detectedBoxes: 0,
  recognizedLines: 0,
  backend: 'unknown',
}

/**
 * Resolves the best passport number from visual and MRZ sources.
 *
 * OCR frequently confuses the first character of a passport number in the
 * MRZ data line (U↔0, B↔8, I↔1, O↔0, S↔5). The visual label zone is
 * printed in much larger characters and is read more reliably. When the
 * visual number and MRZ number are the same length and identical from
 * position 1 onward, the visual reading is trusted for the first character.
 */
function resolvePassportNumber(visual: string, mrz: string): string {
  if (!visual || !mrz) return mrz || visual
  if (visual === mrz) return mrz
  // Same suffix → only the first character differs → prefer visual
  if (visual.length === mrz.length && visual.slice(1) === mrz.slice(1)) {
    return visual
  }
  return mrz
}

/** Builds one passport model, with ICAO TD3 overriding visual OCR fields. */
export function parsePassportText(
  rawText: string,
  averageConfidence = 0,
  metrics: OCRMetrics = EMPTY_METRICS,
): PassportExtraction {
  const mrz = findMrzLines(rawText)
  const mrzResult = parseMrz(mrz)
  const visualData = extractVisualPassportData(rawText)

  // The nationality field in MRZ data line can be corrupted by OCR. The
  // country code embedded in the name line (P<XXX…) is written in larger,
  // cleaner characters and is more reliably read.
  if (mrzResult.data.nationality && mrz[0]) {
    mrzResult.data.nationality = correctedNationality(mrz[0], mrzResult.data.nationality)
  }

  const mrzData = restoreMrzNameSpacing(mrzResult.data, visualData)
  assertPassportDocument(rawText, mrz.length === 2, visualData)

  const data = mergePassportData(visualData, mrzData)
  data.fullName = `${data.surname} ${data.givenName}`.trim()

  // Prefer visual passport number when OCR confused only the first character.
  data.passportNumber = resolvePassportNumber(
    visualData.passportNumber ?? '',
    data.passportNumber,
  )

  const labelledIssueDate = visualData.issueDate ?? ''
  data.issueDate = resolvePassportIssueDate(rawText, data, labelledIssueDate)

  const evidence = createPassportEvidence({
    data,
    mrzData,
    visualData,
    averageConfidence,
    mrzValid: mrzResult.valid,
    issueDateWasInferred: data.issueDate !== labelledIssueDate,
  })

  return {
    data,
    evidence,
    confidence: confidenceFromEvidence(evidence),
    rawText,
    mrz,
    warnings: mrzResult.warnings,
    isMrzValid: mrzResult.valid,
    metrics,
  }
}
