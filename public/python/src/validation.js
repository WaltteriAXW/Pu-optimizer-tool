/**
 * Input Validation Module
 *
 * @module validation
 * @description Provides comprehensive input validation for the Polyurethane Injection Optimizer.
 * This module ensures data integrity and provides user-friendly error messages.
 * All validation logic matches the Python backend for consistency.
 *
 * @example
 * import { validateInputs, validateField, sanitizeNumber } from './validation';
 *
 * // Validate all inputs
 * const result = validateInputs(inputs);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 *
 * // Validate single field
 * const fieldResult = validateField('pipeLength', 500);
 * console.log(fieldResult.valid); // true
 *
 * // Sanitize user input
 * const clean = sanitizeNumber('123.45', 0); // 123.45
 */

import { VALIDATION_RANGES, PHYSICS, THRESHOLDS } from './constants';

/**
 * Custom validation error class
 *
 * @class
 * @extends Error
 * @property {string} name - Error name ('ValidationError')
 * @property {string} message - Error message
 * @property {string|null} field - Field name that failed validation
 *
 * @example
 * throw new ValidationError('Invalid pipe length', 'pipeLength');
 */
export class ValidationError extends Error {
  /**
   * Create a validation error
   *
   * @param {string} message - Error message
   * @param {string} [field=null] - Field name that failed validation
   */
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validation result type
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if validation failed
 * @property {string} [field] - Field name that failed validation
 */

/**
 * Validate a single field
 *
 * @param {string} field - Field name from VALIDATION_RANGES
 * @param {number|string} value - Value to validate
 * @returns {ValidationResult}
 */
export function validateField(field, value) {
  const range = VALIDATION_RANGES[field];

  if (!range) {
    return { valid: true };
  }

  // Convert to number if string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Check if valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return {
      valid: false,
      error: `${range.name} must be a valid number`,
      field
    };
  }

  // Check minimum
  if (numValue < range.min) {
    return {
      valid: false,
      error: `${range.name} must be at least ${range.min} ${range.unit} (current: ${numValue.toFixed(1)} ${range.unit})`,
      field
    };
  }

  // Check maximum
  if (numValue > range.max) {
    return {
      valid: false,
      error: `${range.name} must not exceed ${range.max} ${range.unit} (current: ${numValue.toFixed(1)} ${range.unit})`,
      field
    };
  }

  return { valid: true };
}

/**
 * Input parameters object
 * @typedef {Object} InputParams
 * @property {number} pipeLength - Pipe length in mm
 * @property {number} pipeDiameter - Pipe inner diameter in mm
 * @property {number} temperature - Process temperature in °C
 * @property {number} flowRate - Volumetric flow rate in L/min
 * @property {number} viscosity - Dynamic viscosity in cP
 * @property {number} density - Material density in kg/m³
 */

/**
 * Validate all calculator inputs
 *
 * Performs comprehensive validation of all input parameters including:
 * - Range validation for each field
 * - Physical constraint checks (e.g., diameter vs length ratio)
 * - Type validation
 *
 * @param {InputParams} inputs - Input object with calculator parameters
 * @returns {ValidationResult} Validation result with all errors concatenated
 *
 * @example
 * const inputs = {
 *   pipeLength: 500,
 *   pipeDiameter: 12,
 *   temperature: 25,
 *   flowRate: 5,
 *   viscosity: 350,
 *   density: 1120
 * };
 *
 * const result = validateInputs(inputs);
 * if (!result.valid) {
 *   alert(result.error); // Show all errors
 * }
 *
 * @example
 * // Invalid inputs
 * const badInputs = { pipeLength: 50000, temperature: 100, flowRate: -5 };
 * const result = validateInputs(badInputs);
 * // Returns: {
 * //   valid: false,
 * //   error: "Pipe Length must not exceed 10000 mm...",
 * //   errors: [...]
 * // }
 */
export function validateInputs(inputs) {
  const errors = [];

  // Validate pipe length
  const lengthResult = validateField('pipeLength', inputs.pipeLength);
  if (!lengthResult.valid) errors.push(lengthResult.error);

  // Validate pipe diameter
  const diameterResult = validateField('pipeDiameter', inputs.pipeDiameter);
  if (!diameterResult.valid) errors.push(diameterResult.error);

  // Validate temperature
  const tempResult = validateField('temperature', inputs.temperature);
  if (!tempResult.valid) errors.push(tempResult.error);

  // Validate flow rate
  const flowResult = validateField('flowRate', inputs.flowRate);
  if (!flowResult.valid) errors.push(flowResult.error);

  // Validate viscosity
  const viscResult = validateField('viscosity', inputs.viscosity);
  if (!viscResult.valid) errors.push(viscResult.error);

  // Validate density
  const densityResult = validateField('density', inputs.density);
  if (!densityResult.valid) errors.push(densityResult.error);

  // Additional physical constraint checks
  if (inputs.pipeDiameter > inputs.pipeLength * 0.5) {
    errors.push(
      `Pipe diameter (${inputs.pipeDiameter.toFixed(1)}mm) is unusually large ` +
      `relative to length (${inputs.pipeLength.toFixed(1)}mm)`
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('\n'),
      errors
    };
  }

  return { valid: true };
}

/**
 * Calculated process parameters
 * @typedef {Object} ProcessParams
 * @property {number} reynolds - Reynolds number (dimensionless)
 * @property {number} shearRate - Shear rate in s⁻¹
 * @property {number} apparentViscosity - Apparent viscosity in Pa·s
 * @property {number} velocity - Flow velocity in m/s
 * @property {number} pressureBar - Required pressure in bar
 * @property {number} [machineMaxPressure] - Maximum machine pressure in bar
 * @property {number} [fillTime] - Mold fill time in seconds
 * @property {number} temperature - Process temperature in °C
 */

/**
 * Process validation result
 * @typedef {Object} ProcessValidationResult
 * @property {boolean} valid - True if no warnings
 * @property {string[]} warnings - Array of warning messages
 * @property {string[]} recommendations - Array of recommended actions
 * @property {boolean} hasWarnings - True if warnings present
 * @property {boolean} hasRecommendations - True if recommendations present
 */

/**
 * Validate process parameters (results-based validation)
 *
 * Analyzes calculated results and generates warnings and recommendations based on:
 * - Flow regime (laminar vs turbulent)
 * - Shear rate (material degradation risk)
 * - Viscosity (flow difficulties)
 * - Velocity (turbulence risk)
 * - Pressure (machine capacity)
 * - Fill time (air entrapment or gelation risk)
 * - Temperature (reaction rate considerations)
 *
 * @param {ProcessParams} params - Calculated parameters
 * @returns {ProcessValidationResult} Validation warnings and recommendations
 *
 * @example
 * const params = {
 *   reynolds: 3000,
 *   shearRate: 1200,
 *   apparentViscosity: 0.8,
 *   velocity: 4.5,
 *   pressureBar: 4.2,
 *   machineMaxPressure: 6.0,
 *   fillTime: 15,
 *   temperature: 25
 * };
 *
 * const validation = validateProcessParameters(params);
 * if (validation.hasWarnings) {
 *   validation.warnings.forEach(w => console.warn(w));
 * }
 * if (validation.hasRecommendations) {
 *   validation.recommendations.forEach(r => console.info(r));
 * }
 */
export function validateProcessParameters(params) {
  const warnings = [];
  const recommendations = [];

  const {
    reynolds,
    shearRate,
    apparentViscosity,
    velocity,
    pressureBar,
    machineMaxPressure,
    fillTime,
    temperature
  } = params;

  // Reynolds number check
  if (reynolds > PHYSICS.REYNOLDS_TURBULENT_THRESHOLD) {
    warnings.push(
      `Flow is turbulent (Re = ${reynolds.toFixed(0)} > ${PHYSICS.REYNOLDS_TURBULENT_THRESHOLD})`
    );
    recommendations.push('Reduce flow rate to achieve laminar flow for better quality');
  }

  // Shear rate check
  if (shearRate > THRESHOLDS.SHEAR_RATE_HIGH) {
    warnings.push(`High shear rate (${shearRate.toFixed(0)} s⁻¹) may degrade material`);
    recommendations.push('Consider increasing pipe diameter or reducing flow rate');
  }

  // Viscosity check
  if (apparentViscosity > THRESHOLDS.VISCOSITY_HIGH) {
    warnings.push(`High apparent viscosity (${apparentViscosity.toFixed(3)} Pa·s)`);
    recommendations.push('Consider increasing temperature or reducing flow rate');
  }

  // Velocity check
  if (velocity > THRESHOLDS.VELOCITY_HIGH) {
    warnings.push(`Very high flow velocity (${velocity.toFixed(2)} m/s)`);
    recommendations.push('Reduce flow rate or increase pipe diameter to prevent turbulence');
  }

  // Machine pressure check
  if (machineMaxPressure && pressureBar > machineMaxPressure) {
    warnings.push(
      `Required pressure (${pressureBar.toFixed(2)} bar) exceeds machine capacity ` +
      `(${machineMaxPressure} bar)`
    );
    recommendations.push('Reduce flow rate, increase pipe diameter, or use higher capacity machine');
  }

  // Fill time checks
  if (fillTime !== undefined) {
    if (fillTime < THRESHOLDS.FILL_TIME_TOO_FAST) {
      warnings.push(`Very fast fill time (${fillTime.toFixed(1)}s) may cause air entrapment`);
      recommendations.push(`Increase fill time above ${THRESHOLDS.FILL_TIME_TOO_FAST} seconds to prevent voids`);
    } else if (fillTime > THRESHOLDS.FILL_TIME_TOO_SLOW) {
      warnings.push(`Slow fill time (${fillTime.toFixed(1)}s) may cause premature gelation`);
      recommendations.push('Increase flow rate or check for flow restrictions');
    }
  }

  // Temperature recommendations
  if (temperature < THRESHOLDS.TEMPERATURE_LOW) {
    recommendations.push(`Consider increasing temperature to ${THRESHOLDS.TEMPERATURE_LOW}-${THRESHOLDS.TEMPERATURE_HIGH}°C for better flow properties`);
  } else if (temperature > THRESHOLDS.TEMPERATURE_HIGH) {
    warnings.push(`High temperature (${temperature}°C) may accelerate reaction`);
    recommendations.push('Monitor reaction time closely; consider reducing temperature');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    recommendations,
    hasWarnings: warnings.length > 0,
    hasRecommendations: recommendations.length > 0
  };
}

/**
 * Sanitize numeric input from user
 *
 * Converts strings to numbers and handles invalid values gracefully.
 * Useful for processing form inputs before validation.
 *
 * @param {string|number} value - Input value to sanitize
 * @param {number} [defaultValue=0] - Default value to return if input is invalid
 * @returns {number} Sanitized numeric value or default
 *
 * @example
 * sanitizeNumber('123.45', 0)     // 123.45
 * sanitizeNumber('invalid', 100)  // 100
 * sanitizeNumber(NaN, 0)          // 0
 * sanitizeNumber(Infinity, 1)     // 1
 */
export function sanitizeNumber(value, defaultValue = 0) {
  if (typeof value === 'number') {
    return isFinite(value) ? value : defaultValue;
  }

  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isFinite(num) ? num : defaultValue;
  }

  return defaultValue;
}

/**
 * Clamp a value to a specified range
 *
 * Ensures value is within [min, max] bounds. Commonly used to
 * enforce valid ranges on user inputs.
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value within [min, max]
 *
 * @example
 * clamp(150, 0, 100)   // 100
 * clamp(-5, 0, 100)    // 0
 * clamp(50, 0, 100)    // 50
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Field constraints for UI elements
 * @typedef {Object} FieldConstraints
 * @property {number} min - Minimum value for input
 * @property {number} max - Maximum value for input
 * @property {number} step - Step increment for input
 * @property {string} placeholder - Placeholder text showing range
 * @property {string} title - Tooltip text with field description
 */

/**
 * Get field constraints for HTML input elements
 *
 * Returns appropriate min, max, step, placeholder, and title attributes
 * for creating constrained numeric inputs. Step size is calculated based
 * on the range size.
 *
 * @param {string} field - Field name from VALIDATION_RANGES
 * @returns {FieldConstraints} Constraints object for input attributes
 *
 * @example
 * const constraints = getFieldConstraints('pipeLength');
 * // Returns: {
 * //   min: 50,
 * //   max: 10000,
 * //   step: 10,
 * //   placeholder: "50-10000 mm",
 * //   title: "Pipe Length: 50-10000 mm"
 * // }
 *
 * // Use in JSX
 * <input type="number" {...constraints} value={value} />
 */
export function getFieldConstraints(field) {
  const range = VALIDATION_RANGES[field];

  if (!range) {
    return {
      min: undefined,
      max: undefined,
      step: undefined,
      placeholder: ''
    };
  }

  // Calculate appropriate step based on range
  const rangeSize = range.max - range.min;
  let step;

  if (rangeSize > 1000) {
    step = 10;
  } else if (rangeSize > 100) {
    step = 1;
  } else if (rangeSize > 10) {
    step = 0.1;
  } else {
    step = 0.01;
  }

  return {
    min: range.min,
    max: range.max,
    step,
    placeholder: `${range.min}-${range.max} ${range.unit}`,
    title: `${range.name}: ${range.min}-${range.max} ${range.unit}`
  };
}

export default {
  validateField,
  validateInputs,
  validateProcessParameters,
  sanitizeNumber,
  clamp,
  getFieldConstraints,
  ValidationError
};
