import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describeActivationEnergy, ACTIVATION_ENERGY_SOURCE_LABELS } from './resultFormatting'
import { ExportService } from '@/services/ExportService'
import type { ActivationEnergySource, CalculationResults } from '@/calculator_types'

/**
 * The activation energy is labelled by where it came from on the results panel and in every
 * export: a default is always called an estimate, a typed value is "Entered by user".
 */

const results = (source?: ActivationEnergySource, value = 25000): CalculationResults => ({
  input: { pipe_length_mm: 500, pipe_diameter_mm: 12, material_key: 'custom', temperature_c: 35, flow_rate_lpm: 5 },
  flow: { shear_rate_s_inv: 100, apparent_viscosity_cp: 300, reynolds_number: 10, flow_regime: 'laminar', velocity_m_s: 1 },
  pressure: {
    base_pressure_drop_bar: 1, pressure_drop_pa: 100000, pressure_with_fittings_bar: 1.2,
    fitting_loss_bar: 0.2, reynolds_number: 10, flow_regime: 'laminar',
  },
  thermal: {
    temperature_c: 35, reference_temp_c: 25, reference_viscosity_cp: 350,
    current_viscosity_cp: 252, temperature_factor: 0.72,
    ...(source ? { activation_energy_j_mol: value, activation_energy_source: source } : {}),
  },
  timestamp: '2026-11-14T10:00:00Z',
})

describe('describeActivationEnergy', () => {
  it('calls the default an estimate', () => {
    expect(describeActivationEnergy(results('default').thermal)?.label).toBe('Estimate, typical value')
  })

  it('marks a typed value as entered by the user', () => {
    expect(describeActivationEnergy(results('user').thermal)?.label).toBe('Entered by user')
  })

  it('says a calculated value came from the two readings', () => {
    expect(describeActivationEnergy(results('calculated', 37700).thermal)).toEqual({
      valueJMol: 37700,
      label: 'Calculated from two viscosity readings',
      source: 'calculated',
    })
  })

  it('shows nothing for runs saved before the engine reported it', () => {
    expect(describeActivationEnergy(results().thermal)).toBeNull()
    expect(describeActivationEnergy(undefined)).toBeNull()
  })
})

describe('activation energy in exports', () => {
  const service = new ExportService()

  it.each(Object.entries(ACTIVATION_ENERGY_SOURCE_LABELS) as Array<[ActivationEnergySource, string]>)(
    'labels a %s value in JSON, CSV and the text report',
    (source, label) => {
      const run = results(source)
      const json = JSON.parse(service.export(run, { format: 'json' }))
      expect(json.thermal.activation_energy_j_mol).toBe(25000)
      expect(json.thermal.activation_energy_source).toBe(source)
      expect(json.thermal.activation_energy_label).toBe(label)

      expect(service.export(run, { format: 'csv' })).toContain(`Activation Energy (${label}),25000,J/mol`)
      expect(service.export(run, { format: 'report' })).toContain(`Activation Energy:  25000 J/mol (${label})`)
    }
  )

  it('adds nothing to the exports of runs saved before the engine reported it', () => {
    const run = results()
    expect(JSON.parse(service.export(run, { format: 'json' })).thermal.activation_energy_label).toBeUndefined()
    expect(service.export(run, { format: 'csv' })).not.toContain('Activation Energy')
    expect(service.export(run, { format: 'report' })).not.toContain('Activation Energy')
  })
})

describe('the typical default shown on the form', () => {
  it('is the value Python calculates with', async () => {
    // Display only on the form; Python is the source. This keeps the two from drifting.
    const { DEFAULT_ACTIVATION_ENERGY_J_MOL } = await import('./CalculatorForm')
    const python = readFileSync(join(process.cwd(), 'src', 'core', 'modules', 'thermal.py'), 'utf-8')
    const match = python.match(/^DEFAULT_ACTIVATION_ENERGY_J_MOL = ([\d.]+)$/m)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBe(DEFAULT_ACTIVATION_ENERGY_J_MOL)
  })
})
