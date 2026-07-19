export const PASSPORT_PARSING_CONFIG = {
  maxNameLength: 60,
  dateValueMaxLines: 3,
  ocrLabelSimilarity: 0.75,
  td3LineLength: 44,
  td3LengthTolerance: 4,
  mrzCandidateMinLength: 30,
  mrzCandidateMaxLength: 60,
  maxTrailingFillerArtifacts: 4,
  trailingNameFillerRun: 3,
  minYear: 1900,
  maxYear: 2099,
  twoDigitYearCutoff: 40,
} as const
