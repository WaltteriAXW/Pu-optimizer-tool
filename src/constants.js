/**
 * Application Constants Module
 *
 * @module constants
 * @description Centralized configuration and magic numbers for the Polyurethane Optimizer.
 * All physical constants, validation ranges, thresholds, and default values are defined here
 * to eliminate magic numbers and ensure consistency across the application.
 *
 * @example
 * import { PHYSICS, VALIDATION_RANGES, formatValue } from './constants';
 *
 * // Use physical constants
 * const reynoldsThreshold = PHYSICS.REYNOLDS_LAMINAR_THRESHOLD;
 *
 * // Validate input
 * const validation = validateInput('pipeLength', 500);
 *
 * // Format output
 * const formatted = formatValue(123.456, 'pressure'); // "123.46"
 */

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

/**
 * Physical constants used in calculations
 * @constant {Object}
 * @property {number} GAS_CONSTANT - Universal gas constant in J/(mol·K)
 * @property {number} ATMOSPHERIC_PRESSURE_BAR - Standard atmospheric pressure in bar
 * @property {number} REYNOLDS_LAMINAR_THRESHOLD - Reynolds number below which flow is laminar (dimensionless)
 * @property {number} REYNOLDS_TURBULENT_THRESHOLD - Reynolds number above which flow is turbulent (dimensionless)
 * @property {number} PI - Mathematical constant π (Math.PI)
 */
export const PHYSICS = {
  // Universal gas constant (J/(mol·K))
  GAS_CONSTANT: 8.314,

  // Atmospheric pressure (bar)
  ATMOSPHERIC_PRESSURE_BAR: 1.01325,

  // Reynolds number thresholds
  REYNOLDS_LAMINAR_THRESHOLD: 2300,
  REYNOLDS_TURBULENT_THRESHOLD: 2300,

  // Mathematical constants (for reference, use Math.PI in code)
  PI: Math.PI
};

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================

/**
 * Default material properties for polyurethane formulations
 * @constant {Object}
 * @property {number} ACTIVATION_ENERGY_STANDARD - Activation energy for standard PU formulations in J/mol
 * @property {number} ACTIVATION_ENERGY_XHD - Activation energy for extra-high density formulations in J/mol
 * @property {number} ACTIVATION_ENERGY_SPRAY - Activation energy for spray formulations in J/mol
 * @property {number} POWER_LAW_INDEX_STANDARD - Power law index for standard formulations (dimensionless, typically 0.8-0.9)
 * @property {number} POWER_LAW_INDEX_XHD - Power law index for XHD formulations (dimensionless)
 * @property {number} POWER_LAW_INDEX_SPRAY - Power law index for spray formulations (dimensionless)
 * @property {number} REFERENCE_TEMPERATURE - Reference temperature for viscosity calculations in °C
 * @property {number} SAFETY_FACTOR - Safety factor applied to pressure calculations (dimensionless)
 */
export const MATERIAL_DEFAULTS = {
  // Activation energy (J/mol)
  ACTIVATION_ENERGY_STANDARD: 25000.0,
  ACTIVATION_ENERGY_XHD: 28000.0,
  ACTIVATION_ENERGY_SPRAY: 24000.0,

  // Power law index (dimensionless)
  POWER_LAW_INDEX_STANDARD: 0.85,
  POWER_LAW_INDEX_XHD: 0.82,
  POWER_LAW_INDEX_SPRAY: 0.88,

  // Reference temperature (°C)
  REFERENCE_TEMPERATURE: 25,

  // Safety factor for pressure calculations
  SAFETY_FACTOR: 1.5
};

// ============================================================================
// VALIDATION RANGES
// ============================================================================

/**
 * Range specification for a validation field
 * @typedef {Object} RangeSpec
 * @property {number} min - Minimum allowed value
 * @property {number} max - Maximum allowed value
 * @property {string} unit - Unit of measurement
 * @property {string} name - Display name for the field
 */

/**
 * Validation ranges for all input fields
 * Defines minimum and maximum acceptable values with units
 *
 * @constant {Object.<string, RangeSpec>}
 * @property {RangeSpec} pipeLength - Pipe length constraints (50-10000 mm)
 * @property {RangeSpec} pipeDiameter - Pipe inner diameter constraints (1-200 mm)
 * @property {RangeSpec} temperature - Process temperature constraints (5-50 °C)
 * @property {RangeSpec} flowRate - Volumetric flow rate constraints (0.1-200 L/min)
 * @property {RangeSpec} viscosity - Dynamic viscosity constraints (50-10000 cP)
 * @property {RangeSpec} density - Material density constraints (900-1500 kg/m³)
 *
 * @example
 * const range = VALIDATION_RANGES.pipeLength;
 * console.log(`${range.name}: ${range.min}-${range.max} ${range.unit}`);
 * // Output: "Pipe Length: 50-10000 mm"
 */
export const VALIDATION_RANGES = {
  pipeLength: {
    min: 50,
    max: 10000,
    unit: 'mm',
    name: 'Pipe Length'
  },
  pipeDiameter: {
    min: 4,
    max: 25,
    unit: 'mm',
    name: 'Pipe Diameter'
  },
  temperature: {
    min: 18,
    max: 35,
    unit: '°C',
    name: 'Temperature'
  },
  flowRate: {
    min: 0.5,
    max: 100,
    unit: 'L/min',
    name: 'Flow Rate'
  },
  viscosity: {
    min: 200,
    max: 1200,
    unit: 'cP',
    name: 'Viscosity'
  },
  density: {
    min: 1050,
    max: 1250,
    unit: 'kg/m³',
    name: 'Density'
  }
};

// ============================================================================
// PROCESS THRESHOLDS
// ============================================================================

/**
 * Process parameter thresholds for warnings and recommendations
 *
 * @constant {Object}
 * @property {number} SHEAR_RATE_HIGH - High shear rate threshold in s⁻¹ (above this may degrade material)
 * @property {number} VISCOSITY_HIGH - High apparent viscosity threshold in Pa·s (indicates flow difficulties)
 * @property {number} VELOCITY_HIGH - High flow velocity threshold in m/s (may cause turbulence)
 * @property {number} FILL_TIME_TOO_FAST - Minimum recommended fill time in seconds (faster may trap air)
 * @property {number} FILL_TIME_TOO_SLOW - Maximum recommended fill time in seconds (slower may cause gelation)
 * @property {number} PRESSURE_WARNING - Pressure warning threshold in bar
 * @property {number} PRESSURE_HIGH - High pressure threshold in bar
 * @property {number} TEMPERATURE_LOW - Minimum recommended temperature in °C
 * @property {number} TEMPERATURE_HIGH - Maximum recommended temperature in °C (higher may accelerate reaction)
 * @property {number} MACHINE_OUTPUT_LOW_MARGIN - Minimum recommended machine output utilization (30%)
 * @property {number} MACHINE_OUTPUT_HIGH_MARGIN - Maximum recommended machine output utilization (90%)
 *
 * @example
 * if (shearRate > THRESHOLDS.SHEAR_RATE_HIGH) {
 *   console.warn('Shear rate too high, may degrade material');
 * }
 */
export const THRESHOLDS = {
  // Shear rate threshold (s⁻¹)
  SHEAR_RATE_HIGH: 1000,

  // Viscosity threshold (Pa·s)
  VISCOSITY_HIGH: 1.0,

  // Velocity threshold (m/s)
  VELOCITY_HIGH: 5.0,

  // Mold filling time thresholds (seconds)
  FILL_TIME_TOO_FAST: 2,
  FILL_TIME_TOO_SLOW: 30,

  // Pressure thresholds (bar)
  PRESSURE_WARNING: 5.0,
  PRESSURE_HIGH: 6.0,

  // Temperature recommendations (°C)
  TEMPERATURE_LOW: 20,
  TEMPERATURE_HIGH: 35,

  // Machine output rate margins
  MACHINE_OUTPUT_LOW_MARGIN: 0.3,
  MACHINE_OUTPUT_HIGH_MARGIN: 0.9
};

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================

/**
 * Unit conversion factors and functions
 *
 * @constant {Object}
 *
 * @property {number} MM_TO_M - Convert millimeters to meters (multiply by 0.001)
 * @property {number} M_TO_MM - Convert meters to millimeters (multiply by 1000)
 *
 * @property {number} LITER_TO_M3 - Convert liters to cubic meters (multiply by 0.001)
 * @property {number} M3_TO_LITER - Convert cubic meters to liters (multiply by 1000)
 * @property {number} MM3_TO_LITER - Convert cubic millimeters to liters (multiply by 1e-6)
 *
 * @property {number} L_PER_MIN_TO_M3_PER_SEC - Convert L/min to m³/s (multiply by 1/60000)
 * @property {number} M3_PER_SEC_TO_L_PER_MIN - Convert m³/s to L/min (multiply by 60000)
 *
 * @property {number} CP_TO_PA_S - Convert centipoise to pascal-seconds (multiply by 0.001)
 * @property {number} PA_S_TO_CP - Convert pascal-seconds to centipoise (multiply by 1000)
 *
 * @property {number} PA_TO_KPA - Convert pascals to kilopascals (multiply by 0.001)
 * @property {number} KPA_TO_PA - Convert kilopascals to pascals (multiply by 1000)
 * @property {number} PA_TO_BAR - Convert pascals to bar (multiply by 1e-5)
 * @property {number} BAR_TO_PA - Convert bar to pascals (multiply by 100000)
 * @property {number} KPA_TO_BAR - Convert kilopascals to bar (multiply by 0.01)
 * @property {number} BAR_TO_KPA - Convert bar to kilopascals (multiply by 100)
 *
 * @property {Function} CELSIUS_TO_KELVIN - Convert Celsius to Kelvin
 * @property {Function} KELVIN_TO_CELSIUS - Convert Kelvin to Celsius
 *
 * @example
 * // Length conversion
 * const meters = 500 * CONVERSIONS.MM_TO_M; // 0.5 m
 *
 * // Temperature conversion
 * const kelvin = CONVERSIONS.CELSIUS_TO_KELVIN(25); // 298.15 K
 *
 * // Pressure conversion
 * const bar = 200000 * CONVERSIONS.PA_TO_BAR; // 2 bar
 */
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
  CELSIUS_TO_KELVIN: (c) => c + 273.15,
  KELVIN_TO_CELSIUS: (k) => k - 273.15
};

// ============================================================================
// UI CONFIGURATION
// ============================================================================

/**
 * User interface configuration and display settings
 *
 * @constant {Object}
 * @property {number} INPUT_DEBOUNCE_DELAY - Debounce delay for input fields in milliseconds
 * @property {number} MOLD_DEBOUNCE_DELAY - Debounce delay for mold dimension inputs in milliseconds
 * @property {number} CALCULATION_SIMULATED_DELAY - Artificial delay for calculation UI feedback in milliseconds
 * @property {number} LOADING_ANIMATION_DELAY - Delay before showing loading animation in milliseconds
 * @property {number} PRESSURE_PROFILE_POINTS - Number of data points in pressure profile chart
 * @property {number} PRESSURE_VS_LENGTH_POINTS - Number of data points in pressure vs length chart
 * @property {number} PRESSURE_VS_LENGTH_STEP - Step size for pressure vs length calculations in mm
 * @property {Object} DECIMAL_PLACES - Decimal places for formatting different value types
 * @property {number} DECIMAL_PLACES.pressure - Decimal places for pressure values (2)
 * @property {number} DECIMAL_PLACES.temperature - Decimal places for temperature values (1)
 * @property {number} DECIMAL_PLACES.viscosity - Decimal places for viscosity values (4)
 * @property {number} DECIMAL_PLACES.volume - Decimal places for volume values (3)
 * @property {number} DECIMAL_PLACES.time - Decimal places for time values (3)
 * @property {number} DECIMAL_PLACES.density - Decimal places for density values (0)
 * @property {number} DECIMAL_PLACES.percentage - Decimal places for percentage values (1)
 *
 * @example
 * // Use debounce delay
 * const debouncedValue = useDebounce(value, UI_CONFIG.INPUT_DEBOUNCE_DELAY);
 *
 * // Format display value
 * const formatted = value.toFixed(UI_CONFIG.DECIMAL_PLACES.pressure);
 */
export const UI_CONFIG = {
  // Debounce delays (milliseconds)
  INPUT_DEBOUNCE_DELAY: 500,
  MOLD_DEBOUNCE_DELAY: 300,

  // Calculation delays (milliseconds)
  CALCULATION_SIMULATED_DELAY: 800,

  // Animation delays
  LOADING_ANIMATION_DELAY: 200,

  // Data points for charts
  PRESSURE_PROFILE_POINTS: 20,
  PRESSURE_VS_LENGTH_POINTS: 10,
  PRESSURE_VS_LENGTH_STEP: 100, // mm

  // Decimal places for display
  DECIMAL_PLACES: {
    pressure: 2,
    temperature: 1,
    viscosity: 4,
    volume: 3,
    time: 3,
    density: 0,
    percentage: 1
  }
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default values for all application inputs
 *
 * @constant {Object}
 * @property {number} pipeLength - Default pipe length in mm (500)
 * @property {number} pipeDiameter - Default pipe inner diameter in mm (12)
 * @property {number} temperature - Default process temperature in °C (25)
 * @property {number} flowRate - Default volumetric flow rate in L/min (5)
 * @property {number} viscosity - Default dynamic viscosity in cP (350)
 * @property {number} density - Default material density in kg/m³ (1120)
 * @property {number} specificGravity - Default specific gravity (1.12)
 *
 * @property {string} moldShape - Default mold shape ('rectangular')
 * @property {number} moldLength - Default mold length in mm (1000)
 * @property {number} moldWidth - Default mold width in mm (500)
 * @property {number} moldHeight - Default mold height in mm (50)
 * @property {number} moldDiameter - Default mold diameter in mm (500)
 * @property {number} moldCylinderHeight - Default cylinder height in mm (1000)
 * @property {number} moldSphereDiameter - Default sphere diameter in mm (500)
 * @property {number} moldWallThickness - Default wall thickness in mm (50)
 *
 * @property {number} polyolSG - Default polyol specific gravity (1.12)
 * @property {number} isoSG - Default isocyanate specific gravity (1.23)
 * @property {number} partVolume - Default part volume in liters (1.0)
 *
 * @property {string} machine - Default machine preset ID ('low_pressure')
 * @property {string} material - Default material preset ID ('ecofoam_standard')
 *
 * @example
 * // Reset input to default
 * const defaultTemp = DEFAULTS.temperature; // 25
 */
export const DEFAULTS = {
  // Input defaults
  pipeLength: 500,
  pipeDiameter: 12,
  temperature: 25,
  flowRate: 5,
  viscosity: 350,
  density: 1120,
  specificGravity: 1.12,

  // Mold defaults
  moldShape: 'rectangular',
  moldLength: 1000,
  moldWidth: 500,
  moldHeight: 50,
  moldDiameter: 500,
  moldCylinderHeight: 1000,
  moldSphereDiameter: 500,
  moldWallThickness: 50,

  // Mix ratio defaults
  polyolSG: 1.12,
  isoSG: 1.23,
  partVolume: 1.0,

  // Machine and material
  machine: 'low_pressure', // Default to Low-Pressure system
  material: 'ecofoam_standard'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if validation failed
 */

/**
 * Validate a numeric input against its range
 *
 * @param {string} field - Field name (must exist in VALIDATION_RANGES)
 * @param {number|string} value - Value to validate
 * @returns {ValidationResult} Validation result with error message if invalid
 *
 * @example
 * const result = validateInput('pipeLength', 500);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 *
 * @example
 * // Invalid value
 * const result = validateInput('temperature', 100);
 * // Returns: { valid: false, error: "Temperature must not exceed 50 °C" }
 */
export function validateInput(field, value) {
  const range = VALIDATION_RANGES[field];
  if (!range) return { valid: true };

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return {
      valid: false,
      error: `${range.name} must be a valid number`
    };
  }

  if (numValue < range.min) {
    return {
      valid: false,
      error: `${range.name} must be at least ${range.min} ${range.unit}`
    };
  }

  if (numValue > range.max) {
    return {
      valid: false,
      error: `${range.name} must not exceed ${range.max} ${range.unit}`
    };
  }

  return { valid: true };
}

/**
 * Format a number for display with appropriate decimal places
 *
 * @param {number|string} value - Value to format
 * @param {string} [type='pressure'] - Value type (determines decimal places)
 * @returns {string|*} Formatted string or original value if not a number
 *
 * @example
 * formatValue(123.456789, 'pressure')  // "123.46" (2 decimals)
 * formatValue(25.678, 'temperature')   // "25.7" (1 decimal)
 * formatValue(0.12345, 'viscosity')    // "0.1235" (4 decimals)
 */
export function formatValue(value, type = 'pressure') {
  const decimals = UI_CONFIG.DECIMAL_PLACES[type] ?? 2;
  return typeof value === 'number' ? value.toFixed(decimals) : value;
}

/**
 * Convert temperature from Celsius to Kelvin
 *
 * @param {number} celsius - Temperature in degrees Celsius
 * @returns {number} Temperature in Kelvin
 *
 * @example
 * celsiusToKelvin(25)   // 298.15
 * celsiusToKelvin(0)    // 273.15
 * celsiusToKelvin(-273.15)  // 0 (absolute zero)
 */
export function celsiusToKelvin(celsius) {
  return CONVERSIONS.CELSIUS_TO_KELVIN(celsius);
}

/**
 * Check if Reynolds number indicates turbulent flow
 *
 * @param {number} reynolds - Reynolds number (dimensionless)
 * @returns {boolean} True if flow is turbulent (Re > 2300)
 *
 * @example
 * isTurbulent(1500)  // false (laminar)
 * isTurbulent(3000)  // true (turbulent)
 */
export function isTurbulent(reynolds) {
  return reynolds > PHYSICS.REYNOLDS_TURBULENT_THRESHOLD;
}

/**
 * Check if value exceeds a named threshold
 *
 * @param {number} value - Value to check
 * @param {string} thresholdKey - Key from THRESHOLDS object
 * @returns {boolean} True if value exceeds threshold
 *
 * @example
 * exceedsThreshold(1200, 'SHEAR_RATE_HIGH')  // true (1200 > 1000)
 * exceedsThreshold(800, 'SHEAR_RATE_HIGH')   // false (800 < 1000)
 */
export function exceedsThreshold(value, thresholdKey) {
  return value > (THRESHOLDS[thresholdKey] ?? Infinity);
}
