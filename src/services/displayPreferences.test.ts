import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getPreferences,
  savePreferences,
  toPressureUnit,
  formatPressure,
  getLastInputs,
  saveLastInputs,
  clearLastInputs,
  DEFAULT_PREFERENCES,
} from './displayPreferences'

/**
 * Conversion is display-only, which is the property most worth pinning: a unit preference
 * that reached the engine or the stored records would make two saved runs incomparable.
 *
 * The suite runs in a node environment with no DOM, so localStorage is stubbed here, the
 * same way ShotRecordStore's tests do it. That real browser storage works is proved
 * separately, end to end, by reloading the page.
 */
class MemoryStorage {
  private data = new Map<string, string>()
  private throwing = false

  /** Simulates a private window, or a browser configured to block site data */
  failEverything() {
    this.throwing = true
  }

  getItem(key: string) {
    if (this.throwing) throw new Error('storage blocked')
    return this.data.has(key) ? this.data.get(key)! : null
  }
  setItem(key: string, value: string) {
    if (this.throwing) throw new Error('storage blocked')
    this.data.set(key, value)
  }
  removeItem(key: string) {
    if (this.throwing) throw new Error('storage blocked')
    this.data.delete(key)
  }
  clear() {
    this.data.clear()
  }
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  ;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = storage
})

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage
})

describe('pressure conversion', () => {
  it('leaves bar untouched', () => {
    expect(toPressureUnit(12.34, 'bar')).toBe(12.34)
  })

  it('converts bar to psi', () => {
    // 1 bar = 14.5037738 psi
    expect(toPressureUnit(1, 'psi')).toBeCloseTo(14.5037738, 6)
    expect(toPressureUnit(100, 'psi')).toBeCloseTo(1450.37738, 4)
  })

  it('round-trips through the machine minimum without drifting', () => {
    const bar = 100
    const psi = toPressureUnit(bar, 'psi')
    expect(psi / 14.503773773).toBeCloseTo(bar, 10)
  })
})

describe('formatPressure', () => {
  it('scales the decimals to the magnitude, not the unit', () => {
    // A pipe drop needs two decimals to say anything at all
    expect(formatPressure(0.25, 'bar')).toBe('0.25')
    // A machine setting does not — trailing digits imply precision the model lacks
    expect(formatPressure(100, 'bar')).toBe('100')
    expect(formatPressure(12.3, 'bar')).toBe('12.3')
  })

  it('applies the same rule after converting', () => {
    // 0.25 bar is 3.63 psi: still small, still two decimals
    expect(formatPressure(0.25, 'psi')).toBe('3.63')
    // 100 bar is 1450 psi: large, so no decimals
    expect(formatPressure(100, 'psi')).toBe('1450')
  })

  it('says N/A rather than inventing a number', () => {
    expect(formatPressure(undefined, 'bar')).toBe('N/A')
    expect(formatPressure(null, 'bar')).toBe('N/A')
    expect(formatPressure(NaN, 'bar')).toBe('N/A')
    expect(formatPressure(Infinity, 'bar')).toBe('N/A')
  })

  it('honours an explicit decimal count', () => {
    expect(formatPressure(100, 'bar', { decimals: 2 })).toBe('100.00')
  })

  it('handles zero, which is a real reading and not a missing one', () => {
    expect(formatPressure(0, 'bar')).toBe('0.00')
    expect(formatPressure(0, 'psi')).toBe('0.00')
  })
})

describe('stored preferences', () => {
  it('defaults to bar, the unit the engine and the data sheets use', () => {
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES)
    expect(getPreferences().pressureUnit).toBe('bar')
  })

  it('round-trips a choice', () => {
    savePreferences({ pressureUnit: 'psi' })
    expect(getPreferences().pressureUnit).toBe('psi')
  })

  it('falls back to the default for a value it does not recognise', () => {
    localStorage.setItem(
      'pu_optimizer_display_preferences',
      JSON.stringify({ pressureUnit: 'furlongs' })
    )
    expect(getPreferences().pressureUnit).toBe('bar')
  })

  it('survives unparseable storage rather than throwing', () => {
    localStorage.setItem('pu_optimizer_display_preferences', 'not json')
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES)
  })

  it('survives storage being unavailable entirely', () => {
    storage.failEverything()
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES)
    expect(savePreferences({ pressureUnit: 'psi' })).toBe(false)
  })
})

describe('last used inputs', () => {
  it('returns null before anything has been saved', () => {
    expect(getLastInputs()).toBeNull()
  })

  it('round-trips a form setup', () => {
    saveLastInputs({ pipe_length_mm: 750, material_key: 'ecomate_spray' })
    expect(getLastInputs()).toEqual({
      pipe_length_mm: 750,
      material_key: 'ecomate_spray',
    })
  })

  it('rejects a stored array, which is not a form setup', () => {
    localStorage.setItem('pu_optimizer_last_inputs', JSON.stringify([1, 2, 3]))
    expect(getLastInputs()).toBeNull()
  })

  it('survives unparseable storage', () => {
    localStorage.setItem('pu_optimizer_last_inputs', '{{{')
    expect(getLastInputs()).toBeNull()
  })

  it('can be cleared', () => {
    saveLastInputs({ pipe_length_mm: 750 })
    clearLastInputs()
    expect(getLastInputs()).toBeNull()
  })
})
