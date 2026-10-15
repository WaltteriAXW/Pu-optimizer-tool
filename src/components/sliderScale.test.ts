import { describe, it, expect } from 'vitest'
import { fromSliderPosition, toSliderPosition, SLIDER_STEPS } from './sliderScale'

const FLOW = { min: 0.1, max: 200, scale: 'log' } as const
const LENGTH = { min: 50, max: 10000, scale: 'log' } as const
const TEMPERATURE = { min: 5, max: 50, scale: 'linear' } as const

describe('slider scale', () => {
  it('reaches both ends exactly', () => {
    for (const spec of [FLOW, LENGTH, TEMPERATURE]) {
      expect(fromSliderPosition(0, spec)).toBe(spec.min)
      expect(fromSliderPosition(SLIDER_STEPS, spec)).toBe(spec.max)
    }
  })

  it('gives everyday values most of the travel on a log scale', () => {
    // 5 L/min — the default — sits a little past halfway, not in the first 3 % as on a
    // linear slider from 0.1 to 200
    const position = toSliderPosition(5, FLOW) / SLIDER_STEPS
    expect(position).toBeGreaterThan(0.45)
    expect(position).toBeLessThan(0.6)
  })

  it('round-trips a typed value to where the slider shows it', () => {
    for (const [value, spec] of [[5, FLOW], [500, LENGTH], [25, TEMPERATURE]] as const) {
      expect(fromSliderPosition(toSliderPosition(value, spec), spec)).toBeCloseTo(value, 0)
    }
  })

  it('lands on values someone would type', () => {
    for (let position = 0; position <= SLIDER_STEPS; position += 37) {
      const value = fromSliderPosition(position, LENGTH)
      // Never more than two decimals, and on the step for its magnitude
      expect(value).toBe(Number(value.toFixed(2)))
      if (value >= 1000) expect(value % 50).toBe(0)
    }
    expect(fromSliderPosition(500, TEMPERATURE) % 0.5).toBe(0)
  })

  it('never moves backwards as the knob moves forwards', () => {
    let previous = -Infinity
    for (let position = 0; position <= SLIDER_STEPS; position++) {
      const value = fromSliderPosition(position, FLOW)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  it('pins a value outside the range to the nearest end', () => {
    expect(toSliderPosition(1e6, FLOW)).toBe(SLIDER_STEPS)
    expect(toSliderPosition(-3, TEMPERATURE)).toBe(0)
  })
})
