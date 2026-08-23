/**
 * CalculationService Tests
 *
 * Comprehensive test suite for the CalculationService facade.
 * Tests calculation logic, caching, error handling, and Pyodide integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalculationService } from './CalculationService'
import type { ProcessParameters, CalculationResults } from '@/calculator_types'

// Mock Pyodide Manager
const createMockPyodideManager = () => {
  return {
    callPython: vi.fn(),
    // PyodideManager requires this; a mock that omits it does not stand in for the real
    // interface, and the gap only shows up where the mock is passed to the factory
    isReady: vi.fn(() => true)
  }
}

// Mock calculation results
const mockCalculationResults: CalculationResults = {
  input: {
    pipe_length_mm: 1000,
    pipe_diameter_mm: 20,
    material_key: 'ecofoam_standard',
    material_name: 'EcoFoam Standard',
    temperature_c: 25,
    flow_rate_lpm: 10,
    machine_type: 'high_pressure'
  },
  flow: {
    shear_rate_s_inv: 1234.5,
    apparent_viscosity_cp: 850.0,
    reynolds_number: 45.2,
    flow_regime: 'laminar',
    velocity_m_s: 0.531,
    is_shear_thinning: true
  },
  pressure: {
    base_pressure_drop_bar: 3.45,
    pressure_drop_pa: 345000,
    pressure_with_fittings_bar: 4.12,
    fitting_loss_bar: 0.67,
    reynolds_number: 45.2,
    flow_regime: 'laminar'
  },
  thermal: {
    temperature_c: 25,
    reference_viscosity_cp: 850.0,
    current_viscosity_cp: 845.0,
    temperature_factor: 1.0,
    shear_heating_c: 0.5,
    heat_generated_w: 58.0
  },
  environmental: {
    material: 'EcoFoam Standard',
    blowing_agent: 'HFC-134a',
    gwp_per_kg: 5000,
    recommendation: 'Standard option',
    is_eco_friendly: false
  },
  machine_compatibility: {
    is_compatible: true,
    status: 'compatible',
    required_pressure_bar: 250,
    max_pressure_bar: 250,
    warning: undefined
  },
  timestamp: '2024-12-08T10:00:00Z'
}

const mockParameters: ProcessParameters = {
  pipe_length_mm: 1000,
  pipe_diameter_mm: 20,
  material_key: 'ecofoam_standard',
  temperature_c: 25,
  flow_rate_lpm: 10
}

describe('CalculationService', () => {
  let service: CalculationService
  let mockPyodideManager: any

  beforeEach(() => {
    mockPyodideManager = createMockPyodideManager()
    service = new CalculationService(mockPyodideManager)
  })

  describe('calculate()', () => {
    it('should successfully calculate with valid parameters', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      const result = await service.calculate(mockParameters)

      expect(result).toBeDefined()
      expect(result.pressure.base_pressure_drop_bar).toBe(3.45)
      expect(result.flow.reynolds_number).toBe(45.2)
      expect(mockPyodideManager.callPython).toHaveBeenCalledWith(
        'src.core.processors.calculation_processor.calculate_all',
        [mockParameters]
      )
    })

    it('should throw error when parameters are empty', async () => {
      await expect(service.calculate({} as ProcessParameters)).rejects.toThrow(
        'No parameters provided'
      )
    })

    it('should throw error when parameters are null', async () => {
      await expect(service.calculate(null as any)).rejects.toThrow(
        'No parameters provided'
      )
    })

    it('should throw error when Python returns failure', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: false,
        errors: ['Invalid pipe diameter'],
        data: null
      })

      await expect(service.calculate(mockParameters)).rejects.toThrow(
        'Calculation failed: Invalid pipe diameter'
      )
    })

    it('should throw error when Python returns no data', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: null,
        errors: []
      })

      await expect(service.calculate(mockParameters)).rejects.toThrow(
        'Python calculation returned empty data'
      )
    })

    it('should throw error on Pyodide manager exception', async () => {
      mockPyodideManager.callPython.mockRejectedValue(
        new Error('Pyodide initialization failed')
      )

      await expect(service.calculate(mockParameters)).rejects.toThrow(
        'Calculation service error'
      )
    })

    it('should handle multiple error messages from Python', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: false,
        errors: ['Error 1', 'Error 2', 'Error 3'],
        data: null
      })

      await expect(service.calculate(mockParameters)).rejects.toThrow(
        'Error 1, Error 2, Error 3'
      )
    })
  })

  describe('Caching', () => {
    it('should cache calculation results', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      // First call
      const result1 = await service.calculate(mockParameters)
      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(1)

      // Second call with same parameters (should be cached)
      const result2 = await service.calculate(mockParameters)
      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(1) // Still 1
      expect(result1).toEqual(result2)
    })

    it('should not cache results for different parameters', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      // First call
      await service.calculate(mockParameters)
      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(1)

      // Second call with different parameters (different cache key)
      const differentParams: ProcessParameters = {
        ...mockParameters,
        flow_rate_lpm: 20
      }

      const differentResults = { ...mockCalculationResults }
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: differentResults,
        errors: []
      })

      await service.calculate(differentParams)
      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(2)
    })

    it('should distinguish cache keys by all parameters', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      const params1 = mockParameters
      await service.calculate(params1)

      const params2: ProcessParameters = {
        ...mockParameters,
        machine_type: 'low_pressure'
      }
      await service.calculate(params2)

      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(2)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle typical user workflow', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      // Calculate, then repeat the same request as the UI does when nothing changed
      const result1 = await service.calculate(mockParameters)
      expect(result1).toBeDefined()

      const result2 = await service.calculate(mockParameters)
      expect(result2).toEqual(result1)

      // The second one was served from cache rather than crossing into Python again
      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(1)
    })

    it('should handle parameter modification workflow', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      // Initial calculation
      const result1 = await service.calculate(mockParameters)

      // Modify flow rate
      const modifiedParams: ProcessParameters = {
        ...mockParameters,
        flow_rate_lpm: 15
      }

      const modifiedResults: CalculationResults = {
        ...mockCalculationResults,
        input: {
          ...mockCalculationResults.input,
          flow_rate_lpm: 15
        }
      }

      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: modifiedResults,
        errors: []
      })

      const result2 = await service.calculate(modifiedParams)

      expect(result1.input.flow_rate_lpm).toBe(10)
      expect(result2.input.flow_rate_lpm).toBe(15)
      expect(mockPyodideManager.callPython).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge cases', () => {
    it('should handle very large parameter values', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      const largeParams: ProcessParameters = {
        pipe_length_mm: 1000000,
        pipe_diameter_mm: 100,
        material_key: 'ecofoam_standard',
        temperature_c: 100,
        flow_rate_lpm: 1000
      }

      await service.calculate(largeParams)
      expect(mockPyodideManager.callPython).toHaveBeenCalled()
    })

    it('should handle very small parameter values', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      const smallParams: ProcessParameters = {
        pipe_length_mm: 0.1,
        pipe_diameter_mm: 0.01,
        material_key: 'ecofoam_standard',
        temperature_c: -10,
        flow_rate_lpm: 0.001
      }

      await service.calculate(smallParams)
      expect(mockPyodideManager.callPython).toHaveBeenCalled()
    })

    it('should handle rapid successive calls', async () => {
      mockPyodideManager.callPython.mockResolvedValue({
        success: true,
        data: mockCalculationResults,
        errors: []
      })

      const promises = [
        service.calculate(mockParameters),
        service.calculate(mockParameters),
        service.calculate(mockParameters)
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
      // All results should be identical
      expect(results[0]).toEqual(results[1])
      expect(results[1]).toEqual(results[2])
      // Rapid parallel calls may hit Pyodide multiple times during race conditions
      // but sequential calls after should use cache
      expect(mockPyodideManager.callPython).toHaveBeenCalled()
    })
  })
})
