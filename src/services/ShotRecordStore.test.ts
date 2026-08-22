import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRecords,
  getLabelledRecords,
  saveRecord,
  setOutcome,
  deleteRecord,
  clearRecords,
  exportRecords,
  importRecords,
  isLabelled,
  SHOT_OUTCOME_LABEL,
  type ShotRecord,
} from './ShotRecordStore'
import type { ProcessParameters, CalculationResults } from '../calculator_types'

/**
 * The suite runs in a node environment with no DOM, so localStorage is stubbed here rather
 * than in the shared setup — the stub is only wanted by this file. That the real browser
 * storage works is proved separately, by an end-to-end test that reloads the page.
 */
class MemoryStorage {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  clear() {
    this.data.clear()
  }
}

const params = {
  pipe_length_mm: 500,
  pipe_diameter_mm: 12,
  temperature_c: 25,
  flow_rate_lpm: 5,
  material_key: 'genfoam_hd12',
} as ProcessParameters

const results = {
  input: {
    pipe_length_mm: 500,
    pipe_diameter_mm: 12,
    material_key: 'genfoam_hd12',
    temperature_c: 25,
    flow_rate_lpm: 5,
  },
  flow: {
    shear_rate_s_inv: 491,
    apparent_viscosity_cp: 447.6,
    reynolds_number: 57.5,
    flow_regime: 'laminar',
    velocity_m_s: 0.74,
  },
  pressure: {
    base_pressure_drop_bar: 0.14,
    pressure_drop_pa: 14000,
    pressure_with_fittings_bar: 0.17,
    fitting_loss_bar: 0.03,
    reynolds_number: 57.5,
    flow_regime: 'laminar',
  },
} as CalculationResults

beforeEach(() => {
  const scope = globalThis as unknown as { localStorage: unknown }
  scope.localStorage = new MemoryStorage()
})

describe('capturing runs', () => {
  it('keeps a saved run', () => {
    saveRecord(params, results)
    expect(getRecords()).toHaveLength(1)
  })

  it('starts a run unlabelled, because nobody has seen the part yet', () => {
    // A run is saved the moment it is calculated. Defaulting to anything else would
    // manufacture training data out of runs whose outcome nobody has observed.
    const record = saveRecord(params, results)
    expect(record.outcome).toBe('unrecorded')
    expect(isLabelled(record)).toBe(false)
    expect(getLabelledRecords()).toHaveLength(0)
  })

  it('puts the newest run first', () => {
    saveRecord({ ...params, flow_rate_lpm: 5 }, results)
    saveRecord({ ...params, flow_rate_lpm: 9 }, results)
    expect(getRecords()[0].parameters.flow_rate_lpm).toBe(9)
  })

  it('gives every run a distinct id', () => {
    const ids = new Set(
      Array.from({ length: 25 }, () => saveRecord(params, results).id)
    )
    expect(ids.size).toBe(25)
  })

  it('counts a run as training data only once an outcome is recorded', () => {
    const record = saveRecord(params, results)
    expect(getLabelledRecords()).toHaveLength(0)

    setOutcome(record.id, 'voids', 'core of a 60 mm section')
    expect(getLabelledRecords()).toHaveLength(1)
    expect(getRecords()[0].outcome).toBe('voids')
    expect(getRecords()[0].notes).toBe('core of a 60 mm section')
  })

  it('reports an outcome set against a run that is gone', () => {
    expect(setOutcome('no-such-id', 'good')).toBe(false)
  })

  it('deletes and clears', () => {
    const a = saveRecord(params, results)
    saveRecord(params, results)

    deleteRecord(a.id)
    expect(getRecords()).toHaveLength(1)

    clearRecords()
    expect(getRecords()).toHaveLength(0)
  })
})

describe('export and import', () => {
  it('round-trips through an export', () => {
    const first = saveRecord(params, results)
    setOutcome(first.id, 'good')
    saveRecord({ ...params, temperature_c: 30 }, results)

    const payload = exportRecords()
    expect(payload.record_count).toBe(2)

    clearRecords()
    expect(getRecords()).toHaveLength(0)

    const summary = importRecords(payload)
    expect(summary).toEqual({ added: 2, duplicates: 0, rejected: 0 })
    expect(getRecords()).toHaveLength(2)
    expect(getLabelledRecords()).toHaveLength(1)
  })

  it('importing the same file twice changes nothing', () => {
    saveRecord(params, results)
    const payload = exportRecords()

    expect(importRecords(payload)).toEqual({ added: 0, duplicates: 1, rejected: 0 })
    expect(getRecords()).toHaveLength(1)
  })

  it('merges records from another machine without disturbing local ones', () => {
    const local = saveRecord(params, results)

    const incoming = {
      records: [
        { ...local, id: 'from-another-machine', outcome: 'short_shot' as const },
      ],
    }

    expect(importRecords(incoming)).toEqual({ added: 1, duplicates: 0, rejected: 0 })
    expect(getRecords()).toHaveLength(2)
  })

  it('keeps the local copy when an incoming record has the same id', () => {
    // Outcomes are recorded by whoever saw the part. An older export circulating between
    // machines must not overwrite a verdict added since it was taken.
    const local = saveRecord(params, results)
    setOutcome(local.id, 'good')

    importRecords({ records: [{ ...local, outcome: 'unrecorded' as const }] })

    expect(getRecords()[0].outcome).toBe('good')
  })

  it('accepts a bare array as well as a wrapped export', () => {
    const record = saveRecord(params, results)
    clearRecords()

    expect(importRecords([record])).toEqual({ added: 1, duplicates: 0, rejected: 0 })
  })

  it('rejects entries that are not records rather than poisoning the dataset', () => {
    const good = saveRecord(params, results)
    clearRecords()

    const summary = importRecords({
      records: [
        good,
        { id: 'no-parameters', timestamp: '2026-01-01', outcome: 'good' },
        { nonsense: true },
        null,
        'a string',
      ],
    })

    expect(summary.added).toBe(1)
    expect(summary.rejected).toBe(4)
    expect(getRecords()).toHaveLength(1)
  })

  it('rejects an outcome value it does not recognise', () => {
    const record = saveRecord(params, results)
    clearRecords()

    const summary = importRecords({
      records: [{ ...record, outcome: 'catastrophic_success' }],
    })
    expect(summary.rejected).toBe(1)
  })

  it('ignores a file that is not an export at all', () => {
    expect(importRecords({ hello: 'world' })).toEqual({
      added: 0,
      duplicates: 0,
      rejected: 0,
    })
    expect(importRecords(null)).toEqual({ added: 0, duplicates: 0, rejected: 0 })
  })
})

describe('storage that is unavailable', () => {
  it('does not take the calculator down when reads throw', () => {
    // Private windows and browsers set to block site data throw on access rather than
    // returning empty. Losing the record is acceptable; losing the calculation is not.
    const scope = globalThis as unknown as { localStorage: unknown }
    scope.localStorage = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
      removeItem() {
        throw new Error('blocked')
      },
    }

    expect(getRecords()).toEqual([])
    expect(() => saveRecord(params, results)).not.toThrow()
    expect(clearRecords()).toBe(false)
  })
})

describe('outcome vocabulary', () => {
  it('offers the defect kinds an operator would actually see', () => {
    const outcomes = Object.keys(SHOT_OUTCOME_LABEL)
    expect(outcomes).toContain('good')
    expect(outcomes).toContain('voids')
    expect(outcomes).toContain('short_shot')
    expect(outcomes).toContain('scorch')
  })

  it('every outcome has a label, so none can render as a raw key', () => {
    for (const [value, label] of Object.entries(SHOT_OUTCOME_LABEL)) {
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toBe(value)
    }
  })
})

describe('record shape', () => {
  it('stores the timestamp as a string that survives JSON', () => {
    // A Date does not round-trip through an export file.
    const record: ShotRecord = saveRecord(params, results)
    expect(typeof record.timestamp).toBe('string')
    expect(new Date(record.timestamp).toString()).not.toBe('Invalid Date')

    const reread = JSON.parse(JSON.stringify(exportRecords())) as {
      records: ShotRecord[]
    }
    expect(reread.records[0].timestamp).toBe(record.timestamp)
  })
})
