/**
 * Calculation Helper Functions
 *
 * @module utils/calculationHelpers
 * @description Pure calculation functions extracted from the main calculator component.
 * Each function performs a specific calculation step and is fully testable in isolation.
 * All functions are pure - they don't mutate inputs and have no side effects.
 */

import { PHYSICS, MATERIAL_DEFAULTS, THRESHOLDS, CONVERSIONS } from '../constants';

/**
 * Unit conversion results
 * @typedef {Object} ConvertedUnits
 * @property {number} radius - Pipe radius in meters
 * @property {number} length - Pipe length in meters
 * @property {number} flowRateM3s - Flow rate in m³/s
 * @property {number} area - Pipe cross-sectional area in m²
 */

/**
 * Convert input units to SI units for calculations
 *
 * @param {Object} inputs - Raw input values
 * @param {number} inputs.pipeDiameter - Pipe inner diameter in mm
 * @param {number} inputs.pipeLength - Pipe length in mm
 * @param {number} inputs.flowRate - Volumetric flow rate in L/min
 * @returns {ConvertedUnits} Converted values in SI units
 *
 * @example
 * const converted = convertUnits({ pipeDiameter: 12, pipeLength: 500, flowRate: 5 });
 * // Returns: { radius: 0.006, length: 0.5, flowRateM3s: 0.0000833..., area: 0.000113... }
 */
export function convertUnits(inputs) {
  const radius = (inputs.pipeDiameter / 2) * CONVERSIONS.MM_TO_M;
  const length = inputs.pipeLength * CONVERSIONS.MM_TO_M;
  const flowRateM3s = inputs.flowRate * CONVERSIONS.L_PER_MIN_TO_M3_PER_SEC;
  const area = Math.PI * Math.pow(radius, 2);

  return { radius, length, flowRateM3s, area };
}

/**
 * Select material-specific properties based on preset
 *
 * @param {string} materialPreset - Material preset ID
 * @returns {Object} Material properties
 * @returns {number} return.activationEnergy - Activation energy in J/mol
 * @returns {number} return.powerLawIndex - Power law index (dimensionless)
 * @returns {number} return.safetyFactor - Safety factor for pressure calculations
 *
 * @example
 * const props = getMaterialProperties('ecofoam_xhd');
 * // Returns: { activationEnergy: 28000, powerLawIndex: 0.82, safetyFactor: 1.5 }
 */
export function getMaterialProperties(materialPreset) {
  const activationEnergy = materialPreset === 'ecofoam_xhd'
    ? MATERIAL_DEFAULTS.ACTIVATION_ENERGY_XHD
    : MATERIAL_DEFAULTS.ACTIVATION_ENERGY_STANDARD;

  const powerLawIndex = materialPreset === 'ecofoam_xhd'
    ? MATERIAL_DEFAULTS.POWER_LAW_INDEX_XHD
    : MATERIAL_DEFAULTS.POWER_LAW_INDEX_STANDARD;

  return {
    activationEnergy,
    powerLawIndex,
    safetyFactor: MATERIAL_DEFAULTS.SAFETY_FACTOR
  };
}

/**
 * Calculate temperature correction factor using Arrhenius equation
 *
 * μ(T) = μ₀ × exp[Ea/R × (1/T - 1/T₀)]
 *
 * @param {number} temperatureCelsius - Process temperature in °C
 * @param {number} activationEnergy - Activation energy in J/mol
 * @returns {number} Temperature correction factor (dimensionless)
 *
 * @example
 * const factor = calculateTemperatureFactor(30, 25000);
 * // Returns: ~0.85 (viscosity decreases with temperature)
 */
export function calculateTemperatureFactor(temperatureCelsius, activationEnergy) {
  const tempK = CONVERSIONS.CELSIUS_TO_KELVIN(temperatureCelsius);
  const refTempK = CONVERSIONS.CELSIUS_TO_KELVIN(MATERIAL_DEFAULTS.REFERENCE_TEMPERATURE);

  return Math.exp(
    (activationEnergy / PHYSICS.GAS_CONSTANT) * (1 / tempK - 1 / refTempK)
  );
}

/**
 * Calculate shear rate for power law fluids in circular pipes
 *
 * γ̇ = 4Q / (πr³)
 *
 * @param {number} flowRateM3s - Volumetric flow rate in m³/s
 * @param {number} radius - Pipe radius in meters
 * @returns {number} Shear rate in s⁻¹
 *
 * @example
 * const shearRate = calculateShearRate(0.0000833, 0.006);
 * // Returns: ~733 s⁻¹
 */
export function calculateShearRate(flowRateM3s, radius) {
  return (4 * flowRateM3s) / (Math.PI * Math.pow(radius, 3));
}

/**
 * Calculate apparent viscosity using power law model
 *
 * μ = K × γ̇^(n-1)
 *
 * @param {number} baseViscosity - Base viscosity in Pa·s
 * @param {number} temperatureFactor - Temperature correction factor
 * @param {number} shearRate - Shear rate in s⁻¹
 * @param {number} powerLawIndex - Power law index (n)
 * @returns {Object} Viscosity results
 * @returns {number} return.correctedViscosity - Temperature-corrected viscosity in Pa·s
 * @returns {number} return.apparentViscosity - Shear-corrected apparent viscosity in Pa·s
 *
 * @example
 * const visc = calculateApparentViscosity(0.35, 1.2, 733, 0.85);
 * // Returns: { correctedViscosity: 0.42, apparentViscosity: 0.38 }
 */
export function calculateApparentViscosity(baseViscosity, temperatureFactor, shearRate, powerLawIndex) {
  const correctedViscosity = baseViscosity * temperatureFactor;
  const apparentViscosity = correctedViscosity * Math.pow(shearRate, powerLawIndex - 1);

  return { correctedViscosity, apparentViscosity };
}

/**
 * Calculate flow velocity and Reynolds number
 *
 * @param {number} flowRateM3s - Volumetric flow rate in m³/s
 * @param {number} area - Pipe cross-sectional area in m²
 * @param {number} density - Material density in kg/m³
 * @param {number} diameter - Pipe diameter in mm
 * @param {number} correctedViscosity - Temperature-corrected viscosity in Pa·s
 * @returns {Object} Flow characteristics
 * @returns {number} return.velocity - Flow velocity in m/s
 * @returns {number} return.reynolds - Reynolds number (dimensionless)
 * @returns {string} return.flowRegime - Flow regime ('Laminar' or 'Turbulent')
 *
 * @example
 * const flow = calculateFlowCharacteristics(0.0000833, 0.000113, 1120, 12, 0.42);
 * // Returns: { velocity: 0.737, reynolds: 1850, flowRegime: 'Laminar' }
 */
export function calculateFlowCharacteristics(flowRateM3s, area, density, diameter, correctedViscosity) {
  const velocity = flowRateM3s / area;
  const diameterM = diameter * CONVERSIONS.MM_TO_M;
  const reynolds = (density * velocity * diameterM) / correctedViscosity;
  const flowRegime = reynolds < PHYSICS.REYNOLDS_LAMINAR_THRESHOLD ? 'Laminar' : 'Turbulent';

  return { velocity, reynolds, flowRegime };
}

/**
 * Calculate pressure drop using Hagen-Poiseuille equation for power law fluids
 *
 * ΔP = (8μLQ)/(πr⁴) × [(3n+1)/(4n)]
 *
 * @param {number} apparentViscosity - Apparent viscosity in Pa·s
 * @param {number} length - Pipe length in meters
 * @param {number} flowRateM3s - Flow rate in m³/s
 * @param {number} radius - Pipe radius in meters
 * @param {number} powerLawIndex - Power law index (n)
 * @param {number} safetyFactor - Safety factor multiplier
 * @returns {Object} Pressure results
 * @returns {number} return.pressureDrop - Pressure drop in Pa
 * @returns {number} return.pressureDropBar - Pressure drop in bar
 * @returns {number} return.totalPressureBar - Total pressure with safety factor in bar
 *
 * @example
 * const pressure = calculatePressureDrop(0.38, 0.5, 0.0000833, 0.006, 0.85, 1.5);
 * // Returns: { pressureDrop: 185000, pressureDropBar: 1.85, totalPressureBar: 3.79 }
 */
export function calculatePressureDrop(apparentViscosity, length, flowRateM3s, radius, powerLawIndex, safetyFactor) {
  const powerLawCorrection = (3 * powerLawIndex + 1) / (4 * powerLawIndex);
  const pressureDrop = ((8 * apparentViscosity * length * flowRateM3s) /
    (Math.PI * Math.pow(radius, 4))) * powerLawCorrection;

  const pressureDropBar = pressureDrop * CONVERSIONS.PA_TO_BAR;
  const totalPressureBar = PHYSICS.ATMOSPHERIC_PRESSURE_BAR + (pressureDropBar * safetyFactor);

  return {
    pressureDrop,
    pressureDropBar,
    totalPressureBar
  };
}

/**
 * Calculate injection times for pipe and mold
 *
 * @param {number} radius - Pipe radius in meters
 * @param {number} length - Pipe length in meters
 * @param {number} flowRateM3s - Flow rate in m³/s
 * @param {number} moldVolumeLiters - Mold volume in liters
 * @returns {Object} Time calculations
 * @returns {number} return.pipeVolume - Pipe volume in liters
 * @returns {number} return.pipeFillingTime - Time to fill pipe in seconds
 * @returns {number} return.moldFillingTime - Time to fill mold in seconds
 * @returns {number} return.injectionTime - Total injection time in seconds
 *
 * @example
 * const times = calculateInjectionTimes(0.006, 0.5, 0.0000833, 2.5);
 * // Returns: { pipeVolume: 0.0565, pipeFillingTime: 0.68, moldFillingTime: 30, injectionTime: 30.68 }
 */
export function calculateInjectionTimes(radius, length, flowRateM3s, moldVolumeLiters) {
  const pipeVolumeM3 = Math.PI * Math.pow(radius, 2) * length;
  const pipeVolume = pipeVolumeM3 * CONVERSIONS.M3_TO_LITER;
  const pipeFillingTime = pipeVolumeM3 / flowRateM3s;

  const moldVolumeM3 = moldVolumeLiters * CONVERSIONS.LITER_TO_M3;
  const moldFillingTime = moldVolumeM3 / flowRateM3s;

  const injectionTime = moldVolumeLiters > 0
    ? pipeFillingTime + moldFillingTime
    : pipeFillingTime;

  return {
    pipeVolume,
    pipeFillingTime,
    moldFillingTime,
    injectionTime
  };
}

/**
 * Generate pressure profile data for different pipe lengths
 *
 * @param {number} apparentViscosity - Apparent viscosity in Pa·s
 * @param {number} flowRateM3s - Flow rate in m³/s
 * @param {number} radius - Pipe radius in meters
 * @param {number} powerLawIndex - Power law index
 * @param {number} safetyFactor - Safety factor
 * @param {number} machineMaxPressure - Machine max pressure in bar
 * @param {number} [step=100] - Step size in mm
 * @param {number} [maxLength=1000] - Maximum length in mm
 * @returns {Array<Object>} Pressure profile data points
 *
 * @example
 * const profile = generatePressureProfile(0.38, 0.0000833, 0.006, 0.85, 1.5, 6.0);
 * // Returns: [{ length: 100, pressure: 1.75, machineLimit: 6.0 }, ...]
 */
export function generatePressureProfile(
  apparentViscosity,
  flowRateM3s,
  radius,
  powerLawIndex,
  safetyFactor,
  machineMaxPressure,
  step = 100,
  maxLength = 1000
) {
  const pressureData = [];
  const powerLawCorrection = (3 * powerLawIndex + 1) / (4 * powerLawIndex);

  for (let len = step; len <= maxLength; len += step) {
    const lengthM = len * CONVERSIONS.MM_TO_M;
    const pressureDrop = ((8 * apparentViscosity * lengthM * flowRateM3s) /
      (Math.PI * Math.pow(radius, 4))) * powerLawCorrection;
    const pressureBar = PHYSICS.ATMOSPHERIC_PRESSURE_BAR +
      ((pressureDrop * CONVERSIONS.PA_TO_BAR) * safetyFactor);

    pressureData.push({
      length: len,
      pressure: parseFloat(pressureBar.toFixed(3)),
      machineLimit: machineMaxPressure
    });
  }

  return pressureData;
}

/**
 * Check machine compatibility
 *
 * @param {number} totalPressureBar - Required pressure in bar
 * @param {Object} machineSpec - Machine specifications
 * @param {number} machineSpec.maxPressure - Machine max pressure in bar
 * @returns {boolean} True if machine can handle the pressure
 *
 * @example
 * const compatible = checkMachineCompatibility(3.5, { maxPressure: 6.0 });
 * // Returns: true
 */
export function checkMachineCompatibility(totalPressureBar, machineSpec) {
  return totalPressureBar <= machineSpec.maxPressure;
}

/**
 * Calculate maximum flow rate for laminar flow
 *
 * @param {number} correctedViscosity - Corrected viscosity in Pa·s
 * @param {number} density - Material density in kg/m³
 * @param {number} diameter - Pipe diameter in mm
 * @param {number} area - Pipe cross-sectional area in m²
 * @returns {number} Maximum flow rate for laminar flow in L/min
 *
 * @example
 * const maxFlow = calculateMaxLaminarFlowRate(0.42, 1120, 12, 0.000113);
 * // Returns: ~8.5 L/min
 */
export function calculateMaxLaminarFlowRate(correctedViscosity, density, diameter, area) {
  const diameterM = diameter * CONVERSIONS.MM_TO_M;
  const maxFlowM3s = (PHYSICS.REYNOLDS_LAMINAR_THRESHOLD * correctedViscosity) /
    (density * diameterM) * area;
  return maxFlowM3s * CONVERSIONS.M3_PER_SEC_TO_L_PER_MIN;
}

export default {
  convertUnits,
  getMaterialProperties,
  calculateTemperatureFactor,
  calculateShearRate,
  calculateApparentViscosity,
  calculateFlowCharacteristics,
  calculatePressureDrop,
  calculateInjectionTimes,
  generatePressureProfile,
  checkMachineCompatibility,
  calculateMaxLaminarFlowRate
};
