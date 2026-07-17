import { describe, expect, it } from 'vitest'
import { findDatesInText, normalizeDate } from './passport'

describe('passport date normalization', () => {
  it.each([
    ["28 NOV '19", '2019-11-28'],
    ['24MAR8Q25', '2025-03-24'],
    ['20MAR2025', '2025-03-20'],
    ['18 DIC 2025', '2025-12-18'],
    ['15OCT2020', '2020-10-15'],
    ['01NOV69', '1969-11-01'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeDate(input)).toBe(expected)
  })

  it('reconstructs a date split across OCR rows', () => {
    expect(findDatesInText('28\nNOV\n19')).toContain('2019-11-28')
  })

  it('rejects impossible calendar dates', () => {
    expect(normalizeDate('31 FEB 2025')).toBe('')
  })
})
