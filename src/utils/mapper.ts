import type { PassportData } from '../types/passport'

export const passportFormFields: Array<{ name: keyof PassportData; placeholder: string; type?: string }> = [
  { name: 'passportNumber', placeholder: 'C12345678' },
  { name: 'surname', placeholder: 'NGUYEN' },
  { name: 'givenName', placeholder: 'TIEN THU' },
  { name: 'fullName', placeholder: 'NGUYEN TIEN THU' },
  { name: 'nationality', placeholder: 'VNM' },
  { name: 'gender', placeholder: 'M / F / X' },
  { name: 'dateOfBirth', placeholder: 'YYYY-MM-DD', type: 'date' },
  { name: 'issueDate', placeholder: 'YYYY-MM-DD', type: 'date' },
  { name: 'expiryDate', placeholder: 'YYYY-MM-DD', type: 'date' },
]
