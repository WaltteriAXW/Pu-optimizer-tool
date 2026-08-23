/**
 * CalculationService - Facade for all calculation operations
 *
 * This is the ONLY interface that React components should use for calculations.
 * It abstracts the Python backend via Pyodide.
 *
 * Single responsibility: coordinate all calculations and return results
 */

import type { ProcessParameters, CalculationResults } from '@/calculator_types'

/**
 * Interface for PyodideManager to provide proper typing
 */
export interface PyodideManager {
  callPython<T = unknown>(functionPath: string, args: unknown[]): Promise<T>
  isReady(): boolean
  loadPackage?(packageName: string): Promise<void>
}

/**
 * Result from Python calculation with type safety
 */
interface PythonCalculationResult {
  success: boolean
  errors?: string[]
  warnings?: string[]
  data?: CalculationResults
}

/** Maximum number of cached calculations to prevent memory leaks */
const MAX_CACHE_SIZE = 100

export class CalculationService {
  private pyodideManager: PyodideManager
  private calculationCache: Map<string, CalculationResults> = new Map()
  private cacheOrder: string[] = [] // Track insertion order for LRU eviction

  constructor(pyodideManager: PyodideManager) {
    this.pyodideManager = pyodideManager
  }

  /**
   * Calculate all properties for given parameters.
   *
   * Single entry point for all calculations.
   * Handles Python execution, error recovery, and result validation.
   */
  async calculate(parameters: ProcessParameters): Promise<CalculationResults> {
    try {
      // Validate parameters exist
      if (!parameters || Object.keys(parameters).length === 0) {
        throw new Error('No parameters provided')
      }

      // Create cache key from parameters
      const cacheKey = this.createCacheKey(parameters)

      // Check cache
      const cached = this.calculationCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Catalogued materials go across as a key; Python resolves them from the CSV
      const preparedParameters = this.prepareParameters(parameters)

      // Call Python backend with full module path
      const result = await this.pyodideManager.callPython<PythonCalculationResult>(
        'src.core.processors.calculation_processor.calculate_all',
        [preparedParameters]
      )

      // Validate result is properly typed
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from Python backend')
      }

      // Check for errors from Python
      if (!result.success) {
        throw new Error(`Calculation failed: ${result.errors?.join(', ') || 'Unknown error'}`)
      }

      // Validate result structure
      if (!result.data) {
        throw new Error('Python calculation returned empty data')
      }

      // Type-safe cast - ensure all required fields are present
      const calculationResult: CalculationResults = {
        input: result.data.input || { pipe_length_mm: 0, pipe_diameter_mm: 0, material_key: '', temperature_c: 0, flow_rate_lpm: 0 },
        flow: result.data.flow || { shear_rate_s_inv: 0, apparent_viscosity_cp: 0, reynolds_number: 0, flow_regime: 'laminar', velocity_m_s: 0 },
        pressure: result.data.pressure || { base_pressure_drop_bar: 0, pressure_drop_pa: 0, pressure_with_fittings_bar: 0, fitting_loss_bar: 0, reynolds_number: 0, flow_regime: 'laminar' },
        thermal: result.data.thermal,
        environmental: result.data.environmental,
        machine_compatibility: result.data.machine_compatibility,
        // Optional blocks — undefined when Python omitted them, which is how the UI
        // tells "not asked for" apart from "evaluated and found nothing"
        volatility: result.data.volatility,
        line_temperature: result.data.line_temperature,
        cure: result.data.cure,
        timestamp: result.data.timestamp,
        warnings: result.data.warnings || []
      }

      // Cache result with LRU eviction
      this.addToCache(cacheKey, calculationResult)

      return calculationResult
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Calculation service error: ${message}`)
    }
  }

  /**
   * Add item to cache with LRU eviction when cache exceeds MAX_CACHE_SIZE.
   */
  private addToCache(key: string, value: CalculationResults): void {
    // Remove oldest entries if cache is full
    while (this.cacheOrder.length >= MAX_CACHE_SIZE) {
      const oldestKey = this.cacheOrder.shift()
      if (oldestKey) {
        this.calculationCache.delete(oldestKey)
      }
    }

    // Add new entry
    this.calculationCache.set(key, value)
    this.cacheOrder.push(key)
  }

  /**
   * Create a unique cache key from parameters.
   * For custom materials, the key includes the user-entered property values so
   * changing any property produces a cache miss (correct behaviour).
   */
  private createCacheKey(parameters: ProcessParameters): string {
    const safeValue = (val: unknown): string =>
      val === undefined || val === null ? '__null__' : String(val)

    const parts = [
      safeValue(parameters.pipe_length_mm),
      safeValue(parameters.pipe_diameter_mm),
      safeValue(parameters.material_key),
      safeValue(parameters.temperature_c),
      safeValue(parameters.flow_rate_lpm),
      safeValue(parameters.machine_type) || 'high_pressure',
      // Optional inputs must be part of the key too. Leaving them out would serve a
      // cached result computed at a different ambient temperature, which looks exactly
      // like the feature silently not working.
      safeValue(parameters.ambient_temperature_c),
      safeValue(parameters.idle_time_s),
      safeValue(parameters.hose_heat_transfer_coeff_w_m2_k),
      safeValue(parameters.mold_temperature_c),
      safeValue(parameters.part_thickness_mm),
    ]

    if (parameters.material_key === 'custom') {
      parts.push(
        safeValue(parameters.viscosity_cp),
        safeValue(parameters.density_kg_m3),
        safeValue(parameters.flow_index),
        safeValue(parameters.activation_energy_j_mol),
      )
    }

    return parts.join('|')
  }

  /**
   * Prepare the parameters sent to Python.
   *
   * Catalogued materials travel as a material_key alone: Python reads the same material
   * database CSV and derives the properties there, so there is nothing to look up here
   * and no chance of the two sides disagreeing.
   *
   * Custom materials are the exception — the user typed those values, and they are
   * passed through so Python calculates with them instead of a database lookup.
   */
  private prepareParameters(parameters: ProcessParameters): Record<string, unknown> {
    const prepared: Record<string, unknown> = { ...parameters }

    if (parameters.material_key === 'custom') {
      return prepared
    }

    // Strip any custom values left in state after switching back to a catalogued
    // material, so a stale viscosity cannot silently override the database.
    for (const key of [
      'viscosity_cp',
      'density_kg_m3',
      'reference_temp_c',
      'flow_index',
      'activation_energy_j_mol',
      'polyol_sg',
      'iso_sg',
      'weight_ratio',
      'final_density_kg_m3',
    ]) {
      delete prepared[key]
    }

    return prepared
  }
}
