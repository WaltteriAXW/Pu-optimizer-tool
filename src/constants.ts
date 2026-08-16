/**
 * Application constants for the Polyurethane Injection Optimizer.
 *
 * Physical constants, validation ranges, thresholds and default input values, plus the
 * small helpers that use them.
 *
 * @example
 * import { PHYSICS, VALIDATION_RANGES, validateInput, formatValue } from './constants';
 *
 * const reynoldsThreshold = PHYSICS.REYNOLDS_LAMINAR_THRESHOLD;
 * const validation = validateInput('pipeLength', 500);
 * const formatted = formatValue(123.456, 'pressure'); // "123.46"
 */

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

/** Physical constants used in calculations */
export const PHYSICS = {
  /** Universal gas constant, J/(mol·K) */
  GAS_CONSTANT: 8.314,
  /** Standard atmospheric pressure, bar */
  ATMOSPHERIC_PRESSURE_BAR: 1.01325,
  /** Reynolds number below which flow is laminar */
  REYNOLDS_LAMINAR_THRESHOLD: 2300,
  /** Reynolds number above which flow is turbulent */
  REYNOLDS_TURBULENT_THRESHOLD: 2300,
  PI: Math.PI,
} as const

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================

/**
 * Fallback material property values.
 *
 * Per-material properties come from src/data/polyurethane_foam_database.csv, which is the
 * single source of truth. These are only generic typical values.
 */
export const MATERIAL_DEFAULTS = {
  /** Activation energy, J/mol */
  ACTIVATION_ENERGY_STANDARD: 25000.0,
  ACTIVATION_ENERGY_XHD: 28000.0,
  ACTIVATION_ENERGY_SPRAY: 24000.0,

  /** Power law index (dimensionless), typically 0.8-0.9 */
  POWER_LAW_INDEX_STANDARD: 0.85,
  POWER_LAW_INDEX_XHD: 0.82,
  POWER_LAW_INDEX_SPRAY: 0.88,

  /** Reference temperature for viscosity calculations, °C */
  REFERENCE_TEMPERATURE: 25,

  /** Safety factor applied to pressure calculations */
  SAFETY_FACTOR: 1.5,
} as const

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

/** Names of the fields validateInput understands */
export type ValidationField = keyof typeof VALIDATION_RANGES

// ============================================================================
// PROCESS THRESHOLDS
// ============================================================================

/** Threshold values for warnings and recommendations */
export const THRESHOLDS = {
  /** Shear rate above which material may degrade, s⁻¹ */
  SHEAR_RATE_HIGH: 1000,
  /** Apparent viscosity indicating flow difficulty, Pa·s */
  VISCOSITY_HIGH: 1.0,
  /** Flow velocity that may cause turbulence, m/s */
  VELOCITY_HIGH: 5.0,
  /** Minimum recommended fill time, s — faster may trap air */
  FILL_TIME_TOO_FAST: 2,
  /** Maximum recommended fill time, s — slower may gel before filling */
  FILL_TIME_TOO_SLOW: 30,
  /** Pressure warning threshold, bar */
  PRESSURE_WARNING: 5.0,
  /** High pressure threshold, bar */
  PRESSURE_HIGH: 6.0,
  /** Minimum recommended temperature, °C */
  TEMPERATURE_LOW: 20,
  /** Maximum recommended temperature, °C */
  TEMPERATURE_HIGH: 35,
  /** Minimum recommended machine output utilisation */
  MACHINE_OUTPUT_LOW_MARGIN: 0.3,
  /** Maximum recommended machine output utilisation */
  MACHINE_OUTPUT_HIGH_MARGIN: 0.9,
} as const

/** Names of the thresholds exceedsThreshold understands */
export type ThresholdKey = keyof typeof THRESHOLDS

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================

/** Unit conversion factors and helpers */
export const CONVERSIONS = {
  // Length
  MM_TO_M: 1 / 1000,
  M_TO_MM: 1000,

  // Volume
  LITER_TO_M3: 1 / 1000,
  M3_TO_LITER: 1000,
  MM3_TO_LITER: 1 / 1000000,

  // Flow rate
  L_PER_MIN_TO_M3_PER_SEC: 1 / 60000,
  M3_PER_SEC_TO_L_PER_MIN: 60000,

  // Viscosity
  CP_TO_PA_S: 0.001,
  PA_S_TO_CP: 1000,

  // Pressure
  PA_TO_KPA: 1 / 1000,
  KPA_TO_PA: 1000,
  PA_TO_BAR: 1 / 100000,
  BAR_TO_PA: 100000,
  KPA_TO_BAR: 1 / 100,
  BAR_TO_KPA: 100,

  // Temperature
  CELSIUS_TO_KELVIN: (celsius: number): number => celsius + 273.15,
  KELVIN_TO_CELSIUS: (kelvin: number): number => kelvin - 273.15,
} as const

// ============================================================================
// UI CONFIGURATION
// ============================================================================

/** UI timing and display configuration */
export const UI_CONFIG = {
  // Debounce delays, ms
  INPUT_DEBOUNCE_DELAY: 500,
  MOLD_DEBOUNCE_DELAY: 300,
  CALCULATION_SIMULATED_DELAY: 800,
  LOADING_ANIMATION_DELAY: 200,

  // Chart data points
  PRESSURE_PROFILE_POINTS: 20,
  PRESSURE_VS_LENGTH_POINTS: 10,
  /** Step between pressure-vs-length samples, mm */
  PRESSURE_VS_LENGTH_STEP: 100,

  /** Decimal places used when formatting each kind of value */
  DECIMAL_PLACES: {
    pressure: 2,
    temperature: 1,
    viscosity: 4,
    volume: 3,
    time: 3,
    density: 0,
    percentage: 1,
  },
} as const

/** Kinds of value formatValue knows how to format */
export type ValueType = keyof typeof UI_CONFIG.DECIMAL_PLACES

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Outcome of validating a single input */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a numeric input against its range.
 *
 * An unknown field is treated as valid — callers validate a mix of ranged and free fields.
 */
export function validateInput(field: string, value: number | string): ValidationResult {
  const range = (VALIDATION_RANGES as Record<string, RangeSpec>)[field]
  if (!range) return { valid: true }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return { valid: false, error: `${range.name} must be a valid number` }
  }

  if (numValue < range.min) {
    return { valid: false, error: `${range.name} must be at least ${range.min} ${range.unit}` }
  }

  if (numValue > range.max) {
    return { valid: false, error: `${range.name} must not exceed ${range.max} ${range.unit}` }
  }

  return { valid: true }
}

/**
 * Format a number for display with the decimal places appropriate to its kind.
 * Non-numeric input is returned unchanged.
 */
export function formatValue(value: number, type?: ValueType): string
export function formatValue<T>(value: T, type?: ValueType): T
export function formatValue(value: unknown, type: ValueType = 'pressure'): unknown {
  const decimals = UI_CONFIG.DECIMAL_PLACES[type] ?? 2
  return typeof value === 'number' ? value.toFixed(decimals) : value
}

/** Convert Celsius to Kelvin */
export function celsiusToKelvin(celsius: number): number {
  return CONVERSIONS.CELSIUS_TO_KELVIN(celsius)
}

/** Whether a Reynolds number indicates turbulent flow */
export function isTurbulent(reynolds: number): boolean {
  return reynolds > PHYSICS.REYNOLDS_TURBULENT_THRESHOLD
}

/** Whether a value exceeds a named threshold. Unknown thresholds are never exceeded. */
export function exceedsThreshold(value: number, thresholdKey: string): boolean {
  const threshold = (THRESHOLDS as Record<string, number>)[thresholdKey]
  return value > (threshold ?? Infinity)
}
