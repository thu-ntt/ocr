/** English labels printed alongside each passport's local language. */
export const PASSPORT_VISUAL_LABELS = {
  passportNumber: [
    'Passport No\\.?',
    'Passport Number',
    'Document No\\.?',
    'Pasaport No\\.?',     // Turkish
    'No\\. Passeport',    // French
    'N[º°] Pasaporte',   // Spanish
    'Reisepass-?Nr\\.?',  // German
    'वैध सं\\.?',         // Hindi (Passport No)
    'PAASPOORT',         // Afrikaans
  ],
  surname: ['Surname', 'Family name', 'Nom', 'Nachname', 'Apellidos'],
  givenName: ['Given names?', 'First names?', 'Prénom', 'Vorname', 'Nombres'],
  fullName: ['\\bName\\b'],
  nationality: ['Nationality(?:\\s*/\\s*Code)?', 'Nationality Code', 'Nationalité'],
  issueDate: ['Date of issue', 'Date de délivrance', 'Ausstellungsdatum'],
} as const
