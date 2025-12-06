/**
 * Warning and Recommendation Generator
 *
 * @module utils/warningGenerator
 * @description Generates warnings and recommendations based on process parameters.
 * Each function evaluates specific conditions and returns actionable feedback.
 */

import { THRESHOLDS, PHYSICS } from '../constants';

/**
 * Warnings and recommendations result
 * @typedef {Object} WarningsResult
 * @property {string[]} warnings - Array of warning messages
 * @property {string[]} recommendations - Array of recommended actions
 */

/**
 * Generate all warnings and recommendations for process parameters
 *
 * @param {Object} params - Process parameters
 * @param {number} params.reynolds - Reynolds number
 * @param {number} params.shearRate - Shear rate in s⁻¹
 * @param {number} params.velocity - Flow velocity in m/s
 * @param {number} params.temperature - Temperature in °C
 * @param {number} params.totalPressureBar - Total pressure in bar
 * @param {number} params.moldFillingTime - Mold filling time in seconds
 * @param {number} params.moldVolume - Mold volume in liters
 * @param {number} params.flowRateKgMin - Flow rate in kg/min
 * @param {boolean} params.compatible - Machine compatibility
 * @param {Object} params.machine - Machine specifications
 * @param {number} params.correctedViscosity - Corrected viscosity in Pa·s
 * @param {number} params.density - Material density in kg/m³
 * @param {number} params.diameter - Pipe diameter in mm
 * @param {number} params.area - Pipe cross-sectional area in m²
 * @param {Object} params.machineSpecs - All machine specifications
 * @returns {WarningsResult} Warnings and recommendations
 *
 * @example
 * const { warnings, recommendations } = generateWarnings(params);
 * warnings.forEach(w => console.warn(w));
 */
export function generateWarnings(params) {
  const warnings = [];
  const recommendations = [];

  // Flow regime warnings
  addFlowRegimeWarnings(params, warnings, recommendations);

  // Shear rate warnings
  addShearRateWarnings(params, warnings, recommendations);

  // Machine compatibility warnings
  addMachineCompatibilityWarnings(params, warnings, recommendations);

  // Velocity warnings
  addVelocityWarnings(params, warnings, recommendations);

  // Temperature warnings
  addTemperatureWarnings(params, warnings, recommendations);

  // Mold-specific warnings
  addMoldWarnings(params, warnings, recommendations);

  // Machine output rate warnings
  addMachineOutputWarnings(params, warnings, recommendations);

  // Reaction timing warnings (CRITICAL for foam quality)
  addReactionTimingWarnings(params, warnings, recommendations);

  return { warnings, recommendations };
}

/**
 * Add flow regime warnings
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addFlowRegimeWarnings(params, warnings, recommendations) {
  const { reynolds, correctedViscosity, density, diameter, area } = params;

  if (reynolds > PHYSICS.REYNOLDS_TURBULENT_THRESHOLD) {
    warnings.push(
      `Flow is turbulent (Re = ${Math.round(reynolds)} > ${PHYSICS.REYNOLDS_TURBULENT_THRESHOLD}) - consider reducing flow rate`
    );

    // Calculate maximum flow rate for laminar flow
    const diameterM = diameter / 1000;
    const maxFlowM3s = (PHYSICS.REYNOLDS_TURBULENT_THRESHOLD * correctedViscosity) /
      (density * diameterM) * area;
    const maxFlowLMin = maxFlowM3s * 60000;

    recommendations.push(
      `Reduce flow rate below ${maxFlowLMin.toFixed(1)} L/min for laminar flow`
    );
  }
}

/**
 * Add shear rate warnings
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addShearRateWarnings(params, warnings, recommendations) {
  const { shearRate } = params;

  if (shearRate > THRESHOLDS.SHEAR_RATE_HIGH) {
    warnings.push(
      `High shear rate (${Math.round(shearRate)} s⁻¹) may degrade material properties`
    );
    recommendations.push(
      'Consider increasing pipe diameter or reducing flow rate'
    );
  }
}

/**
 * Add machine compatibility warnings
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addMachineCompatibilityWarnings(params, warnings, recommendations) {
  const { compatible, compatibilityResult, totalPressureBar, machine, machineSpecs } = params;

  if (!compatible && compatibilityResult) {
    const minPressure = machine.pressureRange?.min || 0;
    const maxPressure = machine.maxPressure;

    if (compatibilityResult.tooLow) {
      // Pressure is below the minimum operating range
      warnings.push(
        `Required pressure (${totalPressureBar.toFixed(2)} bar) is below the minimum operating range for ${machine.name} (${minPressure}-${maxPressure} bar)`
      );
      recommendations.push(
        `Increase flow rate, reduce pipe diameter, or increase pipe length to reach minimum ${minPressure} bar`
      );

      // Suggest switching to low-pressure system if currently using high-pressure
      if (machine.category === 'High-Pressure' && machineSpecs) {
        recommendations.push(
          'Consider using a Low-Pressure (LP) system which operates at 8-20 bar'
        );
      }
    } else if (compatibilityResult.tooHigh) {
      // Pressure exceeds the maximum capacity
      warnings.push(
        `Required pressure (${totalPressureBar.toFixed(2)} bar) exceeds machine capacity (${maxPressure} bar)`
      );
      recommendations.push(
        'Reduce flow rate, increase pipe diameter, or select a higher capacity machine'
      );

      // Suggest suitable machines
      if (machineSpecs) {
        const suitableMachines = Object.entries(machineSpecs)
          .filter(([_, spec]) => {
            const specMin = spec.pressureRange?.min || 0;
            const specMax = spec.maxPressure;
            return totalPressureBar >= specMin && totalPressureBar <= specMax;
          })
          .slice(0, 2);

        if (suitableMachines.length > 0) {
          recommendations.push(
            `Consider switching to: ${suitableMachines.map(([_, s]) => s.name).join(' or ')}`
          );
        }
      }
    }
  }
}

/**
 * Add velocity warnings
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addVelocityWarnings(params, warnings, recommendations) {
  const { velocity } = params;

  if (velocity > THRESHOLDS.VELOCITY_HIGH) {
    warnings.push(
      `Very high flow velocity (${velocity.toFixed(2)} m/s) may cause turbulence`
    );
    recommendations.push(
      'Reduce flow rate or increase pipe diameter'
    );
  }
}

/**
 * Add temperature warnings and recommendations
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addTemperatureWarnings(params, warnings, recommendations) {
  const { temperature } = params;

  if (temperature < THRESHOLDS.TEMPERATURE_LOW) {
    recommendations.push(
      `Consider increasing temperature to ${THRESHOLDS.TEMPERATURE_LOW}-${THRESHOLDS.TEMPERATURE_HIGH}°C for better flow properties`
    );
  } else if (temperature > THRESHOLDS.TEMPERATURE_HIGH) {
    warnings.push(
      `High temperature (${temperature}°C) may accelerate reaction and reduce pot life`
    );
    recommendations.push(
      'Monitor reaction time closely and consider reducing temperature'
    );
  }
}

/**
 * Add mold-specific warnings
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addMoldWarnings(params, warnings, recommendations) {
  const { moldVolume, moldFillingTime, totalPressureBar } = params;

  if (moldVolume > 0) {
    // Fill time warnings
    if (moldFillingTime < THRESHOLDS.FILL_TIME_TOO_FAST) {
      warnings.push(
        `Very fast mold filling (${moldFillingTime.toFixed(1)}s) may cause air entrapment and voids`
      );
      recommendations.push(
        `Reduce flow rate to increase fill time above ${THRESHOLDS.FILL_TIME_TOO_FAST} seconds`
      );
    } else if (moldFillingTime > THRESHOLDS.FILL_TIME_TOO_SLOW) {
      warnings.push(
        `Slow mold filling (${moldFillingTime.toFixed(1)}s) may cause premature gelation`
      );
      recommendations.push(
        'Increase flow rate or check for flow restrictions'
      );
    }

    // Pressure warnings for mold clamping
    if (totalPressureBar > THRESHOLDS.PRESSURE_HIGH) {
      recommendations.push(
        'Ensure mold clamping force is sufficient for high injection pressure'
      );
    }
  }
}

/**
 * Add machine output rate warnings
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addMachineOutputWarnings(params, warnings, recommendations) {
  const { flowRateKgMin, machine } = params;
  const machineOutputRange = machine.output.toLowerCase();

  if (machineOutputRange.includes('-')) {
    const [minOutput, maxOutput] = machineOutputRange
      .split('-')
      .map(s => parseFloat(s.trim()));

    if (flowRateKgMin < minOutput * THRESHOLDS.MACHINE_OUTPUT_LOW_MARGIN) {
      recommendations.push(
        'Flow rate is very low for this machine. Consider using a smaller capacity machine for better control'
      );
    } else if (flowRateKgMin > maxOutput * THRESHOLDS.MACHINE_OUTPUT_HIGH_MARGIN) {
      warnings.push(
        `Flow rate approaching machine capacity (${machine.output})`
      );
      recommendations.push(
        'Consider using a higher capacity machine or reducing flow rate'
      );
    }
  }
}

/**
 * Simplify a warning message for display
 *
 * @param {string} warning - Full warning message
 * @returns {string} Simplified warning
 *
 * @example
 * simplifyWarning("Flow is turbulent (Re = 3500 > 2300) - consider reducing flow rate")
 * // Returns: "Flow is turbulent - consider reducing flow rate"
 */
export function simplifyWarning(warning) {
  return warning
    .replace(/\(Re = \d+ > \d+\)/g, '')
    .replace(/\(\d+\.?\d* s⁻¹\)/g, '')
    .replace(/\(\d+\.?\d* bar\)/g, '')
    .replace(/\(\d+\.?\d*°C\)/g, '')
    .replace(/\(\d+\.?\d*s\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simplify a recommendation message for display
 *
 * @param {string} recommendation - Full recommendation message
 * @returns {string} Simplified recommendation
 *
 * @example
 * simplifyRecommendation("Reduce flow rate below 8.5 L/min for laminar flow")
 * // Returns: "Reduce flow rate for laminar flow"
 */
export function simplifyRecommendation(recommendation) {
  return recommendation
    .replace(/below \d+\.?\d* L\/min/g, '')
    .replace(/above \d+\.?\d* seconds/g, '')
    .replace(/to \d+-\d+°C/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Add reaction timing warnings (CRITICAL for foam quality)
 *
 * Checks if injection time exceeds cream time - if so, foam will start rising
 * before mold is completely filled, causing voids and defects.
 *
 * @param {Object} params - Process parameters
 * @param {string[]} warnings - Warnings array to modify
 * @param {string[]} recommendations - Recommendations array to modify
 * @private
 */
function addReactionTimingWarnings(params, warnings, recommendations) {
  const { material, injectionTime } = params;

  // Skip if no material or injection time data
  if (!material || !material.reaction || !injectionTime) {
    return;
  }

  const creamTime = material.reaction.creamTime;
  const gelTime = material.reaction.gelTime;

  // CRITICAL: Check if injection time exceeds cream time
  if (creamTime && injectionTime > creamTime.max) {
    warnings.push(
      `⚠️ CRITICAL: Injection time (${injectionTime.toFixed(1)}s) exceeds cream time (${creamTime.max}s). ` +
      `Foam will start rising before mold is completely filled, causing voids and defects.`
    );
    recommendations.push(
      `URGENT: Increase flow rate or reduce mold volume to complete injection within ${creamTime.max} seconds. ` +
      `Current timing will result in incomplete parts.`
    );
  } else if (creamTime && injectionTime > creamTime.min) {
    // Warning if close to cream time (between min and max)
    const margin = creamTime.max - injectionTime;
    warnings.push(
      `Injection time (${injectionTime.toFixed(1)}s) is approaching cream time (${creamTime.min}-${creamTime.max}s). ` +
      `Only ${margin.toFixed(1)}s margin for delays.`
    );
    recommendations.push(
      `Consider increasing flow rate for better safety margin. Target injection time below ${creamTime.min}s.`
    );
  } else if (creamTime && injectionTime <= creamTime.min) {
    // Good timing - no warning needed, but could add info
    // Optional: Could add a positive feedback message here
  }

  // Info about gel time (demold time) - not a warning, just informational
  // This could be shown in the timing analysis section instead
}

export default {
  generateWarnings,
  simplifyWarning,
  simplifyRecommendation
};
