import type { ActivationEnergySource } from '@/calculator_types'

/**
 * Display decisions for the results panel.
 *
 * These live apart from the component so they can be tested directly — the test setup runs in
 * a node environment with no DOM, so a rendered assertion is not available. Each function here
 * corresponds to a defect found by photographing the running application.
 */

/**
 * Present-and-numeric guard. The Python layer sends null for values it could not evaluate,
 * and omits keys entirely for blocks that were not requested.
 *
 * The distinction from a plain truthiness check is the whole point: `gwp_per_kg` is 0 for
 * water-blown foam and `heat_generated_w` is 0 at zero flow. Guarding those with `value &&`
 * both suppressed the row and rendered a bare "0" into the card, because that is what React
 * does with a falsy number in an `&&` expression — and it did so precisely when the value was
 * most favourable.
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * A temperature for a label, at one decimal.
 *
 * Interpolating the raw value produced labels like "Viscosity at 12.901331283799657 °C". The
 * mix-head temperature is the result of an exponential thermal decay, so it is only ever a
 * round number by accident.
 */
export const formatTemperature = (value: unknown): string =>
  isNumber(value) ? `${value.toFixed(1)} °C` : '—'

/**
 * Whether two temperatures are the same once rounded for display.
 *
 * Compared as rendered strings rather than raw floats: two values differing in the twelfth
 * decimal still label two rows identically, and an identical row printed twice is the thing
 * worth suppressing. With no ambient temperature entered, the material sits at its reference
 * temperature and the panel showed "Viscosity at 25 °C · 447.57 cP" twice in a row.
 */
export const isSameTemperature = (a: unknown, b: unknown): boolean =>
  isNumber(a) && isNumber(b) && a.toFixed(1) === b.toFixed(1)

/** What sets an end of the flow window, as a phrase that completes "set by …" */
const WINDOW_BOUND_TEXT: Record<string, string> = {
  pressure: 'the pressure limit',
  turbulence: 'the onset of turbulence',
  machine_output: "the machine's output range",
  input_range: 'the range this tool accepts',
}

export const describeWindowBound = (bound: string): string =>
  WINDOW_BOUND_TEXT[bound] ?? bound

/**
 * One sentence for the flow window. The point is the reason as much as the numbers: "up to
 * 13 L/min" tells an operator where the edge is, "set by the pressure limit" tells them
 * which way to move to widen it.
 */
export const describeFlowWindow = (window: {
  min_lpm: number
  max_lpm: number | null
  min_governed_by: string
  max_governed_by: string
  is_empty: boolean
}): string => {
  if (window.is_empty || !isNumber(window.max_lpm)) {
    return window.max_governed_by === 'pressure' && !isNumber(window.max_lpm)
      ? 'No flow rate in range keeps this line within the pressure limit.'
      : `No flow rate satisfies every limit: ${describeWindowBound(window.max_governed_by)} ` +
          `caps it below the ${window.min_lpm.toFixed(1)} L/min minimum set by ` +
          `${describeWindowBound(window.min_governed_by)}.`
  }
  return (
    `${window.min_lpm.toFixed(1)} – ${window.max_lpm.toFixed(1)} L/min. ` +
    `The top is set by ${describeWindowBound(window.max_governed_by)}, ` +
    `the bottom by ${describeWindowBound(window.min_governed_by)}.`
  )
}

/**
 * How a run's activation energy is labelled in the results and in every export, so the
 * screen, JSON, CSV, text report and PDF all say the same thing. A default is always called
 * an estimate; a typed value is always marked as entered by the user.
 */
export const ACTIVATION_ENERGY_SOURCE_LABELS: Record<ActivationEnergySource, string> = {
  calculated: 'Calculated from two viscosity readings',
  default: 'Estimate, typical value',
  user: 'Entered by user',
  database: 'From the material database',
}

/**
 * The activation energy a run used, rounded for display, with its source label. Null for
 * runs saved before the engine reported it.
 */
export function describeActivationEnergy(
  thermal: { activation_energy_j_mol?: number; activation_energy_source?: ActivationEnergySource } | undefined
): { valueJMol: number; label: string; source: ActivationEnergySource } | null {
  if (!thermal || !isNumber(thermal.activation_energy_j_mol) || !thermal.activation_energy_source) {
    return null
  }
  const source = thermal.activation_energy_source
  const label = ACTIVATION_ENERGY_SOURCE_LABELS[source]
  if (!label) return null
  return { valueJMol: Math.round(thermal.activation_energy_j_mol), label, source }
}
