/**
 * Type definitions for the polyurethane calculator
 */

/**
 * Process parameters for polyurethane injection
 * Note: Uses snake_case naming convention for API compatibility with Python backend
 */
export interface ProcessParameters {
  pipe_length_mm: number;               // mm
  pipe_diameter_mm: number;             // mm
  temperature_c: number;                // °C
  flow_rate_lpm: number;                // L/min
  material_key: string;                 // Material identifier ('custom' for user-defined)
  machine_type?: string;                // Machine type (optional)
  // Injected material properties — set by MaterialProvider for presets,
  // or entered directly by the user when material_key === 'custom'
  viscosity_cp?: number;                // cP
  density_kg_m3?: number;               // kg/m³
  flow_index?: number;                  // Power-law flow index (0–1)
  activation_energy_j_mol?: number;     // J/mol
  polyol_sg?: number;                   // Polyol specific gravity
  iso_sg?: number;                      // Isocyanate specific gravity
  final_density_kg_m3?: number;         // Final foam density after cure (kg/m³)
}

/**
 * Pressure profile point
 */
export interface PressurePoint {
  distance: number;        // mm
  pressure: number;        // kPa
}

/**
 * Calculation results from Python backend
 * Comprehensive structure with input parameters and calculated metrics
 */
export interface CalculationResults {
  input: {
    pipe_length_mm: number;
    pipe_diameter_mm: number;
    material_key: string;
    material_name?: string;
    temperature_c: number;
    flow_rate_lpm: number;
    machine_type?: string;
  };
  flow: {
    shear_rate_s_inv: number;        // s⁻¹
    apparent_viscosity_cp: number;   // cP
    reynolds_number: number;         // dimensionless
    flow_regime: 'laminar' | 'turbulent';
    velocity_m_s: number;            // m/s
    is_shear_thinning?: boolean;
  };
  pressure: {
    base_pressure_drop_bar: number;  // bar
    pressure_drop_pa: number;        // Pa
    pressure_with_fittings_bar: number; // bar
    fitting_loss_bar: number;        // bar
    reynolds_number: number;         // dimensionless
    flow_regime: 'laminar' | 'turbulent';
  };
  thermal?: {
    temperature_c: number;
    reference_viscosity_cp: number;
    current_viscosity_cp: number;
    temperature_factor: number;
    shear_heating_c?: number;
    heat_generated_w?: number;
  };
  environmental?: {
    material: string;
    blowing_agent?: string;
    gwp_per_kg?: number;
    recommendation?: string;
    is_eco_friendly?: boolean;
  };
  machine_compatibility?: {
    is_compatible: boolean;
    status: string;
    available_pressure_bar?: number;
    max_pressure_bar?: number;
    warning?: string;
  };
  timestamp?: string;
  warnings?: string[];
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
