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
  reference_temp_c?: number;            // Temperature the viscosity was measured at

  // Ambient conditions — optional. Supplying an ambient temperature switches on the line
  // thermal model, so the pressure reflects the temperature at the mix head rather than
  // the tank set point. Omitting these leaves the calculation exactly as it was.
  ambient_temperature_c?: number;            // °C around the hose
  idle_time_s?: number;                      // Time the material has stood in the line
  hose_heat_transfer_coeff_w_m2_k?: number;  // Defaults to a bare hose in still air

  // Part geometry — optional. Supplying a part thickness adds the cure/exotherm block,
  // which describes the moulded part rather than the feed line.
  mold_temperature_c?: number;          // °C, defaults to the data sheet value
  part_thickness_mm?: number;           // mm
}

/**
 * Pressure profile point
 */
export interface PressurePoint {
  distance: number;        // mm
  pressure: number;        // kPa
}

/** Flow regimes the Reynolds calculation distinguishes */
export type FlowRegime = 'laminar' | 'transitional' | 'turbulent' | 'unknown';

/**
 * How far the current settings sit from turbulence, and what to change if they have crossed
 * it. Avoiding turbulent flow in the feed line is what the tool is for, so the regime label
 * alone answers only half the question.
 */
export interface LaminarEnvelope {
  reynolds_number: number;
  flow_regime: FlowRegime;
  is_laminar: boolean;
  laminar_limit?: number;
  /** Flow rate at which this line turns turbulent, or null if it cannot within range */
  max_laminar_flow_lpm: number | null;
  /** Critical flow rate as a multiple of the present one */
  flow_headroom_ratio: number | null;
  /** Narrowest pipe that stays laminar at the present flow rate */
  min_laminar_diameter_mm: number | null;
  /** One sentence naming the dial to move, or the margin available */
  recommendation: string | null;
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
    /** Density of the mixed liquid being pumped (kg/m³), blended from both components */
    material_density_kg_m3?: number;
    /**
     * The same output as throughput. This is how a metering pump is set and how machine
     * capacity is specified, so it is the figure that maps onto a dial.
     */
    mass_flow_kg_min?: number;
  };
  flow: {
    shear_rate_s_inv: number;        // s⁻¹
    apparent_viscosity_cp: number;   // cP
    reynolds_number: number;         // dimensionless
    flow_regime: FlowRegime;
    velocity_m_s: number;            // m/s
    is_shear_thinning?: boolean;
    /** How much room is left before the line turns turbulent, and which dial to move */
    laminar_envelope?: LaminarEnvelope;
  };
  pressure: {
    base_pressure_drop_bar: number;  // bar
    pressure_drop_pa: number;        // Pa
    pressure_with_fittings_bar: number; // bar
    fitting_loss_bar: number;        // bar
    reynolds_number: number;         // dimensionless
    flow_regime: FlowRegime;
  };
  thermal?: {
    temperature_c: number;
    reference_temp_c?: number;
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
  /**
   * Whether the blowing agent stays dissolved at these conditions. Present whenever the
   * material names an agent; a status of 'not_volatile' or 'no_boiling_point_data' means
   * nothing was evaluated, and must not be shown as a pass.
   */
  volatility?: {
    status:
      | 'ok'
      | 'marginal'
      | 'flash_risk'
      | 'not_volatile'
      | 'no_boiling_point_data'
      | 'unknown_agent';
    agent: string;
    is_volatile?: boolean | null;
    boiling_point_c?: number | null;
    temperature_margin_c?: number | null;
    /** null when no sourced vapour-pressure constants exist — "not evaluated" */
    vapour_pressure_bar?: number | null;
    pressure_margin_bar?: number | null;
    message: string;
    warning?: string | null;
  };

  /** Present only when an ambient temperature was supplied */
  line_temperature?: {
    set_temperature_c: number;
    ambient_temperature_c: number;
    effective_temperature_c: number;
    drift_c: number;
    time_constant_s: number;
    residence_time_s: number;
    idle_time_s: number;
    governing_regime: 'idle_soak' | 'flow_residence';
    warning?: string | null;
  };

  /**
   * The moulded part, not the feed line. Present only when a part thickness was supplied
   * for a catalogued material.
   */
  cure?: {
    part_thickness_mm: number;
    mold_temperature_c?: number | null;
    mold_temperature_source: 'user' | 'data_sheet' | 'default';
    processing_window?: {
      cream_time_s: number;
      work_time_s: number;
      gel_time_s: number;
      demold_time_s: number;
      temperature_c: number;
    };
    cream_time_s?: number | null;
    gel_time_s?: number | null;
    tack_free_time_s?: number | null;
    adiabatic_rise_c?: number;
    peak_temperature_c?: number;
    scorch_risk?: string;
    scorch_margin_c?: number;
    heat_of_reaction_j_kg?: number;
    /** True when no data sheet figure exists and a literature-typical value was used */
    heat_of_reaction_is_estimated: boolean;
  };

  /**
   * What the machine can do with this line and this output.
   *
   * Two different pressures live here and they are not interchangeable. `line_demand_bar`
   * is hydraulic resistance — what the pump must overcome to move material.
   * `injection_pressure_bar` is what the gauge reads at the mix head, which on a
   * high-pressure machine is set by the mixing requirement rather than by anything
   * resisting flow. Raising it does not move more material: output follows pump speed.
   */
  machine_compatibility?: {
    is_compatible: boolean;
    status: string;

    /** Feed-line drop plus the machine's internal losses (bar) */
    line_demand_bar?: number;
    /** What the gauge reads: the line demand, or the mix head minimum where that is higher */
    injection_pressure_bar?: number;
    injection_pressure_governed_by?: 'line_demand' | 'mix_head_minimum';
    min_pressure_bar?: number;
    max_pressure_bar?: number;

    /** The setting the operator actually makes (kg/min) */
    output_kg_min?: number;
    output_min_kg_min?: number;
    output_max_kg_min?: number;
    /** null when no density was available to convert the flow rate */
    output_in_range?: boolean | null;

    /**
     * Shear rate of the mixing element, NOT a feed-line limit — a mechanical rotor runs
     * around 100–1500 1/s and impingement around 2000–10000, by design.
     */
    mix_head_shear_range?: { min: number; max: number } | null;
    mix_head_type?: string | null;

    /** Set only when the combination genuinely will not work */
    warning?: string | null;
    /** Informational — e.g. the mix head, not the line, is setting the pressure */
    note?: string | null;

    /** @deprecated Runs recorded before the pressure model was split still carry these */
    required_pressure_bar?: number;
    set_pressure_bar?: number;
    set_pressure_governed_by?: 'line_demand' | 'machine_minimum';
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
 * Reference data for blowing agents, independent of any specific formulation.
 *
 * Per-material properties are NOT defined here — they live in
 * src/data/polyurethane_foam_database.csv, which is the single source of truth.
 */
export const BLOWING_AGENT_DATA = {
  HFC: { gwp: 1430, odp: 0, lambda: 0.022, cost: 4.50 },
  HCFC: { gwp: 725, odp: 0.07, lambda: 0.023, cost: 4.20 },
  Pentane: { gwp: 5, odp: 0, lambda: 0.024, cost: 3.80 },
  HFO: { gwp: 1, odp: 0, lambda: 0.022, cost: 5.20 },
  Ecomate: { gwp: 0, odp: 0, lambda: 0.019, cost: 3.95 }
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
