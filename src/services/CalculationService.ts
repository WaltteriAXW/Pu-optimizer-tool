/**
 * CalculationService - Facade for all calculation operations
 *
 * This is the ONLY interface that React components should use for calculations.
 * It abstracts the Python backend via Pyodide.
 *
 * Single responsibility: coordinate all calculations and return results
 */

import type { ProcessParameters, CalculationResults, CalculationError } from '@/models/types'

/**
 * Interface for PyodideManager to provide proper typing
 */
export interface PyodideManager {
  callPython<T = unknown>(functionPath: string, args: unknown[]): Promise<T>
  isReady(): boolean
  loadPackage?(packageName: string): Promise<void>
}

/**
 * Result from Python calculation
 */
interface PythonCalculationResult {
  success: boolean
  errors?: string[]
  warnings?: string[]
  data?: CalculationResults
}

/**
 * Result from machine compatibility check
 */
interface MachineCompatibilityResult {
  is_compatible: boolean
  warning?: string
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

      // Call Python backend
      const result = await this.pyodideManager.callPython<PythonCalculationResult>(
        'calculation_processor.calculate_all',
        [parameters]
      )

      // Check for errors from Python
      if (!result.success) {
        throw new Error(`Calculation failed: ${result.errors?.join(', ') || 'Unknown error'}`)
      }

      // Validate result structure
      if (!result.data) {
        throw new Error('Python calculation returned empty data')
      }

      const calculationResult = result.data as CalculationResults

      // Cache result with LRU eviction
      this.addToCache(cacheKey, calculationResult)

      return calculationResult
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Calculation service error: ${message}`)
    }
  }

  /**
   * Validate parameters before sending to Python.
   * Quick client-side validation to catch obvious errors early.
   */
  async validateParameters(parameters: ProcessParameters): Promise<string[]> {
    const errors: string[] = []

    // Basic type checks
    if (typeof parameters.pipe_length_mm !== 'number' || parameters.pipe_length_mm <= 0) {
      errors.push('Pipe length must be a positive number')
    }

    if (typeof parameters.pipe_diameter_mm !== 'number' || parameters.pipe_diameter_mm <= 0) {
      errors.push('Pipe diameter must be a positive number')
    }

    if (typeof parameters.temperature_c !== 'number') {
      errors.push('Temperature must be a number')
    }

    if (typeof parameters.flow_rate_lpm !== 'number' || parameters.flow_rate_lpm <= 0) {
      errors.push('Flow rate must be a positive number')
    }

    if (!parameters.material_key || typeof parameters.material_key !== 'string') {
      errors.push('Material must be selected')
    }

    return errors
  }

  /**
   * Get pressure compatibility for a machine.
   * Used for quick machine selection feedback.
   */
  async checkMachineCompatibility(
    pressureBar: number,
    machineType: string
  ): Promise<{ compatible: boolean; message: string }> {
    try {
      // Call Python to check compatibility
      const result = await this.pyodideManager.callPython<MachineCompatibilityResult>(
        'pressure.calculate_machine_compatibility',
        [pressureBar, { type: machineType }]
      )

      return {
        compatible: result.is_compatible,
        message: result.warning || 'Compatible'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check failed'
      return {
        compatible: false,
        message
      }
    }
  }

  /**
   * Clear calculation cache (useful after preferences change).
   */
  clearCache(): void {
    this.calculationCache.clear()
    this.cacheOrder = []
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
   * Used to avoid recalculating identical requests.
   * Handles undefined values safely to prevent cache key collisions.
   */
  private createCacheKey(parameters: ProcessParameters): string {
    const safeValue = (val: unknown): string => {
      if (val === undefined || val === null) {
        return '__null__'
      }
      return String(val)
    }

    const key = [
      safeValue(parameters.pipe_length_mm),
      safeValue(parameters.pipe_diameter_mm),
      safeValue(parameters.material_key),
      safeValue(parameters.temperature_c),
      safeValue(parameters.flow_rate_lpm),
      safeValue(parameters.machine_type) || 'high_pressure'
    ].join('|')

    return key
  }

  /**
   * Get last successful calculation (for referencing in UI).
   */
  getLastCalculation(): CalculationResults | null {
    if (this.cacheOrder.length === 0) {
      return null
    }
    const lastKey = this.cacheOrder[this.cacheOrder.length - 1]
    return this.calculationCache.get(lastKey) || null
  }

  /**
   * Get current cache size (useful for debugging/monitoring).
   */
  getCacheSize(): number {
    return this.calculationCache.size
  }
}

/**
 * Export a singleton instance factory.
 * The reducer/hooks will create an instance via this.
 */
export function createCalculationService(pyodideManager: PyodideManager): CalculationService {
  return new CalculationService(pyodideManager)
}
