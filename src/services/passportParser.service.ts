import type { OCRMetrics, PassportExtraction } from '../types/passport'
import { resolveCountryNameInText } from '../config/nationalities'
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

function preferVisualDocumentNumber(
  mrzData: Partial<PassportExtraction['data']>,
  visualData: Partial<PassportExtraction['data']>,
): Partial<PassportExtraction['data']> {
  const mrzNumber = mrzData.passportNumber ?? ''
  const visualNumber = visualData.passportNumber ?? ''
  const differsOnlyAtFirstCharacter = mrzNumber.length === visualNumber.length &&
    mrzNumber.slice(1) === visualNumber.slice(1) &&
    mrzNumber[0] !== visualNumber[0]

  return differsOnlyAtFirstCharacter
    ? { ...mrzData, passportNumber: '' }
    : mrzData
}

function reconcileNationality(
  mrzData: Partial<PassportExtraction['data']>,
  mrzLines: string[],
  rawText: string,
): Partial<PassportExtraction['data']> {
  const issuingState = mrzLines[0]?.slice(2, 5) ?? ''
  const printedCountry = resolveCountryNameInText(rawText)

  return issuingState &&
    printedCountry === issuingState &&
    mrzData.nationality &&
    mrzData.nationality !== issuingState
    ? { ...mrzData, nationality: issuingState }
    : mrzData
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
  const mrzData = reconcileNationality(
    preferVisualDocumentNumber(
      restoreMrzNameSpacing(mrzResult.data, visualData),
      visualData,
    ),
    mrz,
    rawText,
  )
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
