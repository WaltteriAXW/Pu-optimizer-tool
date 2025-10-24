/**
 * Type definitions for the polyurethane calculator
 */

/**
 * Process parameters for polyurethane injection
 */
export interface ProcessParameters {
  pipeLength: number;      // mm
  pipeThickness: number;   // mm
  temperature: number;     // °C
  flowRate: number;        // m³/s
  viscosity?: number;      // cP (centipoise)
  density?: number;        // g/cm³
}

/**
 * Pressure profile point
 */
export interface PressurePoint {
  distance: number;        // mm
  pressure: number;        // kPa
}

/**
 * Calculation results
 */
export interface CalculationResults {
  required_pressure: number;        // kPa
  shear_rate: number;               // s⁻¹
  apparent_viscosity: number;       // Pa·s
  reynolds_number: number;          // dimensionless
  optimal_injection_time: number;   // s
  pressure_profile: PressurePoint[];
  flow_regime: 'laminar' | 'turbulent';
  warnings: string[];
}

/**
 * Environmental impact calculation results
 */
export interface EnvironmentalImpact {
  co2_reduction: number;            // tonnes/year
  thermal_improvement: number;      // percentage
  cost_savings: number;             // currency
  odp_reduction: number;            // ODP units
}

/**
 * Production log entry
 */
export interface ProductionLogEntry {
  timestamp: string;
  pipeLength: number;      // mm
  pipeThickness?: number;  // mm
  temperature: number;     // °C
  pressure: number;        // kPa
  viscosity: number;       // Pa·s
  shearRate?: number;      // s⁻¹
  reynoldsNumber: number;  // dimensionless
  notes?: string;
}

/**
 * Calculator state
 */
export interface CalculatorState {
  loading: boolean;
  error: string | null;
  pyodideReady: boolean;
  results: CalculationResults | null;
}

/**
 * Default parameters for Ecofoam materials
 */
export const DEFAULT_ECOFOAM_PARAMETERS: Partial<ProcessParameters> = {
  viscosity: 350,     // cP
  density: 1.12       // g/cm³
};

/**
 * Default parameters for Isocyanate
 */
export const DEFAULT_ISOCYANATE_PARAMETERS: Partial<ProcessParameters> = {
  viscosity: 200,     // cP
  density: 1.23       // g/cm³
};

/**
 * Blowing agent data
 */
export const BLOWING_AGENT_DATA = {
  HFC: { gwp: 1430, odp: 0, lambda: 0.022, cost: 4.50 },
  HCFC: { gwp: 725, odp: 0.07, lambda: 0.023, cost: 4.20 },
  Pentane: { gwp: 5, odp: 0, lambda: 0.024, cost: 3.80 },
  HFO: { gwp: 1, odp: 0, lambda: 0.022, cost: 5.20 },
  Ecomate: { gwp: 0, odp: 0, lambda: 0.019, cost: 3.95 }
};

/**
 * Material property constants
 */
export const MATERIAL_CONSTANTS = {
  ACTIVATION_ENERGY: 50000,   // J/mol
  GAS_CONSTANT: 8.314,        // J/(mol·K)
  POWER_LAW_INDEX: 0.85       // dimensionless
};

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for Pyodide errors
 */
export class PyodideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PyodideError';
  }
}
