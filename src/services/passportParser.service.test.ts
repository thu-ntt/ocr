import { describe, expect, it } from 'vitest'
import { parsePassportText } from './passportParser.service'

const RAW_TD3 = [
  'PASSPORT',
  "Date of issue",
  "28 NOV '09",
  'P<USAERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36USA7408122F1204159ZE184226B<<<<<10',
].join('\n')

describe('passport extraction core', () => {
  it('uses MRZ as the authoritative source and VIZ for issue date', () => {
    const extraction = parsePassportText(RAW_TD3, 0.82)

    expect(extraction.isMrzValid).toBe(true)
    expect(extraction.data).toMatchObject({
      passportNumber: 'L898902C3',
      surname: 'ERIKSSON',
      givenName: 'ANNA MARIA',
      nationality: 'USA',
      gender: 'F',
      dateOfBirth: '1974-08-12',
      expiryDate: '2012-04-15',
      issueDate: '2009-11-28',
    })
    expect(extraction.evidence.passportNumber.source).toBe('mrz')
    expect(extraction.evidence.issueDate.source).toBe('visual-label')
  })

  it('degrades to editable visual data when MRZ cannot be read', () => {
    const extraction = parsePassportText([
      'PASSPORT',
      'Passport No: C12345678',
      'Surname: NGUYEN',
      'Given Name: AN',
      'Nationality: VNM',
      'Date of issue',
      "28 NOV '19",
    ].join('\n'), 0.74)

    expect(extraction.isMrzValid).toBe(false)
    expect(extraction.data.passportNumber).toBe('C12345678')
    expect(extraction.data.issueDate).toBe('2019-11-28')
    expect(extraction.evidence.issueDate.source).toBe('visual-label')
    expect(extraction.warnings).toContain('Không tìm thấy vùng MRZ TD3 gồm 2 dòng.')
  })

  it('rejects an ICAO visa instead of filling passport fields with label text', () => {
    const visaMrz = 'V<JPNDINH<<GIA<DUY'.padEnd(44, '<')
    expect(() => parsePassportText([
      'JAPAN VISA',
      'Passport No SEXDATEOFBIRTHM25OCTNATIONALITYVNMNO',
      'Surname /GIVEN NAME DINHGIADUYGT',
      'Nationality VNM',
      visaMrz,
      'C7878734<6VNM9510250M200228219B94819620A<E7',
    ].join('\n'), 0.76)).toThrowError('NOT_PASSPORT')
  })
})
