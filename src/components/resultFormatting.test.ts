import { describe, it, expect } from 'vitest'
import { isNumber, formatTemperature, isSameTemperature } from './resultFormatting'

/**
 * Each block below pins one defect found by photographing the running application. They are
 * unit tests on the display decision rather than on the rendered output — the suite runs in a
 * node environment with no DOM — so the rendering itself is confirmed by re-capturing the
 * screenshots that found the bugs.
 */

describe('isNumber', () => {
  it('accepts zero', () => {
    // The defect: `{results.environmental.gwp_per_kg && <DetailRow …/>}`. Water-blown foam
    // has a GWP of 0, so the guard was falsy — React rendered a bare "0" into the card and
    // dropped the row, in exactly the case where the number is best. `heat_generated_w` is 0
    // at zero flow and failed the same way.
    expect(isNumber(0)).toBe(true)
    expect(Boolean(0)).toBe(false) // what the old guard did with the same value
  })

  it('rejects what the Python layer sends for an unevaluated value', () => {
    expect(isNumber(null)).toBe(false)
    expect(isNumber(undefined)).toBe(false)
    expect(isNumber(NaN)).toBe(false)
    expect(isNumber(Infinity)).toBe(false)
  })

  it('rejects a numeric string, which would format but not compute', () => {
    expect(isNumber('25')).toBe(false)
  })
})

describe('formatTemperature', () => {
  it('rounds to one decimal', () => {
    // The label read "Viscosity at 12.901331283799657 °C" — the raw result of the thermal
    // decay, interpolated straight into a template string.
    expect(formatTemperature(12.901331283799657)).toBe('12.9 °C')
  })

  it('keeps a decimal on whole numbers so the column does not jitter', () => {
    expect(formatTemperature(25)).toBe('25.0 °C')
  })

  it('renders zero rather than treating it as missing', () => {
    expect(formatTemperature(0)).toBe('0.0 °C')
  })

  it('falls back for a value that could not be evaluated', () => {
    expect(formatTemperature(undefined)).toBe('—')
    expect(formatTemperature(null)).toBe('—')
  })
})

describe('isSameTemperature', () => {
  it('suppresses the row when the material is at its reference temperature', () => {
    // With no ambient temperature entered, both rows read "Viscosity at 25 °C · 447.57 cP".
    expect(isSameTemperature(25, 25)).toBe(true)
  })

  it('treats values that only differ below the displayed decimal as the same', () => {
    expect(isSameTemperature(25, 25.000000001)).toBe(true)
  })

  it('keeps both rows once the temperatures differ visibly', () => {
    expect(isSameTemperature(12.9, 25)).toBe(false)
    expect(isSameTemperature(25.0, 25.1)).toBe(false)
  })

  it('is false when either side is missing, so the row still renders', () => {
    expect(isSameTemperature(25, undefined)).toBe(false)
    expect(isSameTemperature(undefined, undefined)).toBe(false)
  })
})
