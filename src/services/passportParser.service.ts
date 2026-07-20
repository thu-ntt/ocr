import type { OCRMetrics, PassportExtraction } from '../types/passport'
import { findMrzLines, parseMrz } from './mrz.service'
import { assertPassportDocument } from './passportDocument.service'
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

/** Builds one passport model, with ICAO TD3 overriding visual OCR fields. */
export function parsePassportText(
  rawText: string,
  averageConfidence = 0,
  metrics: OCRMetrics = EMPTY_METRICS,
): PassportExtraction {
  const mrz = findMrzLines(rawText)
  const mrzResult = parseMrz(mrz)
  const visualData = extractVisualPassportData(rawText)
  const mrzData = restoreMrzNameSpacing(mrzResult.data, visualData)
  assertPassportDocument(rawText, mrz.length === 2, visualData)

  const data = mergePassportData(visualData, mrzData)
  data.fullName = `${data.surname} ${data.givenName}`.trim()

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
