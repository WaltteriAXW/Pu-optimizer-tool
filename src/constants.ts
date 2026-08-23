/**
 * Application constants for the Polyurethane Injection Optimizer.
 *
 * What the browser needs: the ranges the form validates against, the values it starts with,
 * and the unit conversions the display offers.
 *
 * The physics constants, warning thresholds and formatting helpers that used to live here
 * are gone. Every one of them was unreferenced, and each was a second copy of a number the
 * Python engine holds authoritatively — the engine is what calculates, so a TypeScript
 * PHYSICS table could only ever drift out of step with it. It had: its
 * REYNOLDS_TURBULENT_THRESHOLD read 2300 where the engine uses 4000.
 *
 * @example
 * import { VALIDATION_RANGES, DEFAULTS, CONVERSIONS } from './constants';
 */

// ============================================================================
// VALIDATION RANGES
// ============================================================================

/** An allowed range for a numeric input field */
export interface RangeSpec {
  /** Minimum allowed value */
  min: number
  /** Maximum allowed value */
  max: number
  /** Unit of measurement */
  unit: string
  /** Display name used in error messages */
  name: string
}

/**
 * Validation ranges for all input fields.
 *
 * MIRRORS src/constants.py VALIDATION_RANGES, which is authoritative. These two tables
 * previously disagreed — the form allowed 18-35 °C where the backend allowed 5-50 — so the
 * form silently rejected values the engine would have accepted. Keep them in step.
 */
export const VALIDATION_RANGES = {
  pipeLength: { min: 50, max: 10000, unit: 'mm', name: 'Pipe Length' },
  pipeDiameter: { min: 1, max: 200, unit: 'mm', name: 'Pipe Diameter' },
  temperature: { min: 5, max: 50, unit: '°C', name: 'Temperature' },
  flowRate: { min: 0.1, max: 200, unit: 'L/min', name: 'Flow Rate' },
  viscosity: { min: 50, max: 10000, unit: 'cP', name: 'Viscosity' },
  density: { min: 900, max: 1500, unit: 'kg/m³', name: 'Density' },
} satisfies Record<string, RangeSpec>

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================

/**
 * Unit conversion factors used by the display.
 *
 * Pressure is the one the operator chooses between: the rest of the application works in
 * bar, and psi is applied at the point of display.
 */
export const CONVERSIONS = {
  // Pressure
  PA_TO_BAR: 1 / 100000,
  BAR_TO_PA: 100000,
  KPA_TO_BAR: 1 / 100,
  BAR_TO_KPA: 100,
  BAR_TO_PSI: 14.503773773,
  PSI_TO_BAR: 1 / 14.503773773,

  // Length
  MM_TO_M: 1 / 1000,
  M_TO_MM: 1000,
  MM_TO_INCH: 1 / 25.4,
  INCH_TO_MM: 25.4,

  // Flow rate
  L_PER_MIN_TO_M3_PER_SEC: 1 / 60000,
  M3_PER_SEC_TO_L_PER_MIN: 60000,

  // Viscosity
  CP_TO_PA_S: 0.001,
  PA_S_TO_CP: 1000,

  // Temperature
  CELSIUS_TO_KELVIN: (celsius: number): number => celsius + 273.15,
  KELVIN_TO_CELSIUS: (kelvin: number): number => kelvin - 273.15,
  CELSIUS_TO_FAHRENHEIT: (celsius: number): number => celsius * 9 / 5 + 32,
  FAHRENHEIT_TO_CELSIUS: (fahrenheit: number): number => (fahrenheit - 32) * 5 / 9,
} as const

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default values pre-filled in the calculator form.
 *
 * Only the fields the form actually reads are kept here. This previously carried a further
 * seventeen unused entries, including a default material of 'ecofoam_standard' — a key that
 * no longer exists in the material database — and a machine that contradicted the form's
 * own default. A constant nobody reads is harmless right up until somebody reads it.
 *
 * The default material now comes from the material database itself: the form selects the
 * first entry in the CSV, so there is no second place for it to go stale.
 */
export const DEFAULTS = {
  pipeLength: 500,
  pipeDiameter: 12,
  temperature: 25,
  flowRate: 5,
} as const
