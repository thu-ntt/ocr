import { describe, expect, it } from 'vitest'
import { detectMachineReadableDocumentType, findMrzLines, parseMrz } from './mrz.service'

const TD3 = [
  'P<USAERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36USA7408122F1204159ZE184226B<<<<<10',
] as const

describe('ICAO TD3 MRZ', () => {
  it('finds exactly two 44-character lines and validates check digits', () => {
    const lines = findMrzLines(`PASSPORT\n${TD3.join('\n')}\nDate of issue`)
    expect(lines).toHaveLength(2)
    expect(lines.every((line) => line.length === 44)).toBe(true)
    expect(parseMrz(lines).valid).toBe(true)
  })

  it('does not treat arbitrary long OCR text as TD3', () => {
    expect(findMrzLines('THIS IS A LONG LINE THAT IS NOT A MACHINE READABLE ZONE 123')).toEqual([])
  })

  it('classifies a damaged or merged V-code MRZ as a visa', () => {
    expect(detectMachineReadableDocumentType('V<JPNDINH<<GIA<DUY<<<<<<<<<<<<<<EXTRAOCRTEXT')).toBe('visa')
  })
})
