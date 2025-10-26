/**
 * Input Validation Module
 *
 * Provides consistent validation across the application
 * Matches Python validation for consistency
 */

import { VALIDATION_RANGES, PHYSICS } from './constants';

/**
 * Validation error class
 */
export class ValidationError extends Error {
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
 * Validate all calculator inputs
 *
 * @param {Object} inputs - Input object with calculator parameters
 * @returns {ValidationResult}
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
 * Validate process parameters (results-based validation)
 *
 * @param {Object} params - Calculated parameters
 * @returns {Object} Validation warnings and recommendations
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
  if (shearRate > 1000) {
    warnings.push(`High shear rate (${shearRate.toFixed(0)} s⁻¹) may degrade material`);
    recommendations.push('Consider increasing pipe diameter or reducing flow rate');
  }

  // Viscosity check
  if (apparentViscosity > 1.0) {
    warnings.push(`High apparent viscosity (${apparentViscosity.toFixed(3)} Pa·s)`);
    recommendations.push('Consider increasing temperature or reducing flow rate');
  }

  // Velocity check
  if (velocity > 5.0) {
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
    if (fillTime < 2) {
      warnings.push(`Very fast fill time (${fillTime.toFixed(1)}s) may cause air entrapment`);
      recommendations.push('Increase fill time above 2 seconds to prevent voids');
    } else if (fillTime > 30) {
      warnings.push(`Slow fill time (${fillTime.toFixed(1)}s) may cause premature gelation`);
      recommendations.push('Increase flow rate or check for flow restrictions');
    }
  }

  // Temperature recommendations
  if (temperature < 20) {
    recommendations.push('Consider increasing temperature to 20-25°C for better flow properties');
  } else if (temperature > 35) {
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
 * Sanitize numeric input
 *
 * @param {string|number} value - Input value
 * @param {number} defaultValue - Default if invalid
 * @returns {number} Sanitized number
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
 * Clamp value to range
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get field constraints for UI
 *
 * @param {string} field - Field name
 * @returns {Object} Constraints object for input elements
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
