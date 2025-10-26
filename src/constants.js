/**
 * Application Constants
 *
 * Centralized configuration and magic numbers for the Polyurethane Optimizer
 */

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

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

export const VALIDATION_RANGES = {
  pipeLength: {
    min: 50,
    max: 10000,
    unit: 'mm',
    name: 'Pipe Length'
  },
  pipeDiameter: {
    min: 1,
    max: 200,
    unit: 'mm',
    name: 'Pipe Diameter'
  },
  temperature: {
    min: 5,
    max: 50,
    unit: '°C',
    name: 'Temperature'
  },
  flowRate: {
    min: 0.1,
    max: 200,
    unit: 'L/min',
    name: 'Flow Rate'
  },
  viscosity: {
    min: 50,
    max: 10000,
    unit: 'cP',
    name: 'Viscosity'
  },
  density: {
    min: 900,
    max: 1500,
    unit: 'kg/m³',
    name: 'Density'
  }
};

// ============================================================================
// PROCESS THRESHOLDS
// ============================================================================

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
  machine: 'cannon_std_legacy',
  material: 'ecofoam_standard'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate a numeric input against its range
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
 */
export function formatValue(value, type = 'pressure') {
  const decimals = UI_CONFIG.DECIMAL_PLACES[type] ?? 2;
  return typeof value === 'number' ? value.toFixed(decimals) : value;
}

/**
 * Convert temperature to Kelvin
 */
export function celsiusToKelvin(celsius) {
  return CONVERSIONS.CELSIUS_TO_KELVIN(celsius);
}

/**
 * Check if Reynolds number indicates turbulent flow
 */
export function isTurbulent(reynolds) {
  return reynolds > PHYSICS.REYNOLDS_TURBULENT_THRESHOLD;
}

/**
 * Check if value exceeds threshold
 */
export function exceedsThreshold(value, thresholdKey) {
  return value > (THRESHOLDS[thresholdKey] ?? Infinity);
}
