/**
 * Display preferences that persist between visits.
 *
 * These change how a figure is shown, never how it is calculated. The engine works in bar
 * throughout and the stored records hold bar; a preference is applied at the moment of
 * display and nowhere else, so switching units can never alter a result or make two saved
 * runs incomparable.
 */

const STORAGE_KEY = 'pu_optimizer_display_preferences'

/**
 * Pressure unit the operator reads.
 *
 * bar is the default because it is what the engine, the material data sheets and the
 * machine specifications all use. psi is offered because a good deal of injection
 * equipment is specified in it, and converting by hand at the machine is how mistakes
 * get made.
 */
export type PressureUnit = 'bar' | 'psi'

export const PRESSURE_UNIT_LABEL: Record<PressureUnit, string> = {
  bar: 'bar',
  psi: 'psi',
}

/** Exact by definition: 1 bar = 100000 Pa, 1 psi = 6894.757293168361 Pa */
const BAR_TO_PSI = 14.503773773

export interface DisplayPreferences {
  pressureUnit: PressureUnit
}

export const DEFAULT_PREFERENCES: DisplayPreferences = {
  pressureUnit: 'bar',
}

/**
 * Read the stored preferences.
 *
 * Guarded the same way the shot store is: a private window, cleared site data, or a browser
 * set to block storage all throw rather than returning empty, and none of them should stop
 * the calculator from opening.
 */
export function getPreferences(): DisplayPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFERENCES

    const unit = (parsed as Partial<DisplayPreferences>).pressureUnit
    return {
      pressureUnit: unit === 'psi' || unit === 'bar' ? unit : DEFAULT_PREFERENCES.pressureUnit,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: DisplayPreferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}

// ============================================================================
// LAST USED INPUTS
// ============================================================================

const INPUTS_KEY = 'pu_optimizer_last_inputs'

/**
 * The form's last state, so a reload does not throw the setup away.
 *
 * Saved runs already survived a reload while the form did not, which made reopening the tab
 * a strange half-restoration: the results of the last calculation were in the history, but
 * the parameters that produced them had reverted to the defaults.
 *
 * Stored as an opaque record rather than a typed ProcessParameters: what is read back came
 * from a possibly older version of the application, and the form validates every field it
 * restores anyway.
 */
export function getLastInputs(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(INPUTS_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function saveLastInputs(inputs: Record<string, unknown>): boolean {
  try {
    localStorage.setItem(INPUTS_KEY, JSON.stringify(inputs))
    return true
  } catch {
    return false
  }
}

export function clearLastInputs(): boolean {
  try {
    localStorage.removeItem(INPUTS_KEY)
    return true
  } catch {
    return false
  }
}

/**
 * Convert a pressure in bar to the unit being displayed.
 *
 * Everything upstream is in bar, so this is the single point of conversion.
 */
export function toPressureUnit(bar: number, unit: PressureUnit): number {
  return unit === 'psi' ? bar * BAR_TO_PSI : bar
}

/**
 * A pressure formatted for display, in the chosen unit.
 *
 * The decimal count follows the magnitude rather than the unit: 0.25 bar and 3.6 psi both
 * need two decimals to mean anything, while 100 bar and 1450 psi do not — trailing zeroes
 * on a machine setting suggest a precision the model does not have.
 */
export function formatPressure(
  bar: number | undefined | null,
  unit: PressureUnit,
  options: { decimals?: number } = {}
): string {
  if (typeof bar !== 'number' || !Number.isFinite(bar)) return 'N/A'

  const value = toPressureUnit(bar, unit)
  const decimals = options.decimals ?? (Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2)
  return value.toFixed(decimals)
}
