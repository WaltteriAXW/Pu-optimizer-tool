/**
 * ValidationService - Comprehensive input validation
 *
 * Handles all validation logic for process parameters.
 * Provides detailed error messages and severity levels.
 */

import type { ProcessParameters } from '@/models/types'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
  value: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export class ValidationService {
  /**
   * Validate all process parameters comprehensively
   */
  validateParameters(parameters: ProcessParameters): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!parameters) {
      return {
        isValid: false,
        errors: [
          {
            field: 'all',
            message: 'No parameters provided',
            severity: 'error',
            value: null
          }
        ],
        warnings: []
      }
    }

    // Pipe length validation
    const lengthError = this.validatePipeLength(parameters.pipe_length_mm)
    if (lengthError) {
      if (lengthError.severity === 'error') {
        errors.push(lengthError)
      } else {
        warnings.push(lengthError)
      }
    }

    // Pipe diameter validation
    const diameterError = this.validatePipeDiameter(parameters.pipe_diameter_mm)
    if (diameterError) {
      if (diameterError.severity === 'error') {
        errors.push(diameterError)
      } else {
        warnings.push(diameterError)
      }
    }

    // Material validation
    const materialError = this.validateMaterial(parameters.material_key)
    if (materialError) errors.push(materialError)

    // Custom material property validation
    if (parameters.material_key === 'custom') {
      errors.push(...this.validateCustomMaterialProperties(parameters))
    }

    // Temperature validation
    const tempWarning = this.validateTemperature(parameters.temperature_c)
    if (tempWarning) {
      if (tempWarning.severity === 'error') {
        errors.push(tempWarning)
      } else {
        warnings.push(tempWarning)
      }
    }

    // Flow rate validation
    const flowError = this.validateFlowRate(parameters.flow_rate_lpm)
    if (flowError) {
      if (flowError.severity === 'error') {
        errors.push(flowError)
      } else {
        warnings.push(flowError)
      }
    }

    // Cross-parameter validation
    const crossValidationWarnings = this.validateCrossParameters(parameters)
    warnings.push(...crossValidationWarnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate pipe length
   */
  private validatePipeLength(length: any): ValidationError | null {
    if (typeof length !== 'number' || isNaN(length)) {
      return {
        field: 'pipe_length_mm',
        message: 'Pipe length must be a number',
        severity: 'error',
        value: length
      }
    }

    if (length <= 0) {
      return {
        field: 'pipe_length_mm',
        message: 'Pipe length must be greater than 0 mm',
        severity: 'error',
        value: length
      }
    }

    if (length > 10000) {
      return {
        field: 'pipe_length_mm',
        message: 'Pipe length exceeds typical maximum (10000 mm)',
        severity: 'warning',
        value: length
      }
    }

    return null
  }

  /**
   * Validate pipe diameter
   */
  private validatePipeDiameter(diameter: any): ValidationError | null {
    if (typeof diameter !== 'number' || isNaN(diameter)) {
      return {
        field: 'pipe_diameter_mm',
        message: 'Pipe diameter must be a number',
        severity: 'error',
        value: diameter
      }
    }

    if (diameter <= 0) {
      return {
        field: 'pipe_diameter_mm',
        message: 'Pipe diameter must be greater than 0 mm',
        severity: 'error',
        value: diameter
      }
    }

    if (diameter < 1) {
      return {
        field: 'pipe_diameter_mm',
        message: 'Pipe diameter is very small (< 1 mm), results may be unreliable',
        severity: 'warning',
        value: diameter
      }
    }

    if (diameter > 100) {
      return {
        field: 'pipe_diameter_mm',
        message: 'Pipe diameter exceeds typical maximum (100 mm)',
        severity: 'warning',
        value: diameter
      }
    }

    return null
  }

  /**
   * Validate material selection
   */
  private validateMaterial(material: any): ValidationError | null {
    if (!material || typeof material !== 'string') {
      return {
        field: 'material_key',
        message: 'Material must be selected',
        severity: 'error',
        value: material
      }
    }

    const validMaterials = [
      'genfoam_hd12',
      'genfoam_hd20',
      'ecomate_spray',
      'ecofoam_xhd_rc',
      'custom',
    ]

    if (!validMaterials.includes(material)) {
      return {
        field: 'material_key',
        message: `Unknown material: ${material}. Must be one of: ${validMaterials.join(', ')}`,
        severity: 'error',
        value: material
      }
    }

    return null
  }

  /**
   * Validate custom material property values when material_key === 'custom'.
   */
  private validateCustomMaterialProperties(parameters: ProcessParameters): ValidationError[] {
    const errors: ValidationError[] = []

    const required: Array<{
      key: keyof ProcessParameters
      label: string
      min: number
      max: number
      unit: string
    }> = [
      { key: 'viscosity_cp',            label: 'Viscosity',         min: 50,   max: 10000,  unit: 'cP'    },
      { key: 'density_kg_m3',           label: 'Density',           min: 900,  max: 1500,   unit: 'kg/m³' },
      { key: 'flow_index',              label: 'Flow Index',        min: 0.01, max: 1.0,    unit: ''      },
      { key: 'activation_energy_j_mol', label: 'Activation Energy', min: 1000, max: 100000, unit: 'J/mol' },
    ]

    for (const { key, label, min, max, unit } of required) {
      const val = parameters[key]
      if (typeof val !== 'number' || isNaN(val as number)) {
        errors.push({
          field: key,
          message: `${label} is required for custom materials`,
          severity: 'error',
          value: val,
        })
      } else if ((val as number) < min || (val as number) > max) {
        errors.push({
          field: key,
          message: `${label} must be between ${min} and ${max}${unit ? ' ' + unit : ''}`,
          severity: 'error',
          value: val,
        })
      }
    }

    return errors
  }

  /**
   * Validate temperature
   */
  private validateTemperature(temperature: any): ValidationError | null {
    if (typeof temperature !== 'number' || isNaN(temperature)) {
      return {
        field: 'temperature_c',
        message: 'Temperature must be a number',
        severity: 'error',
        value: temperature
      }
    }

    if (temperature < -50) {
      return {
        field: 'temperature_c',
        message: 'Temperature is extremely cold (< -50°C)',
        severity: 'warning',
        value: temperature
      }
    }

    if (temperature > 150) {
      return {
        field: 'temperature_c',
        message: 'Temperature exceeds typical maximum (150°C)',
        severity: 'warning',
        value: temperature
      }
    }

    return null
  }

  /**
   * Validate flow rate
   */
  private validateFlowRate(flowRate: any): ValidationError | null {
    if (typeof flowRate !== 'number' || isNaN(flowRate)) {
      return {
        field: 'flow_rate_lpm',
        message: 'Flow rate must be a number',
        severity: 'error',
        value: flowRate
      }
    }

    if (flowRate <= 0) {
      return {
        field: 'flow_rate_lpm',
        message: 'Flow rate must be greater than 0 LPM',
        severity: 'error',
        value: flowRate
      }
    }

    if (flowRate < 0.1) {
      return {
        field: 'flow_rate_lpm',
        message: 'Flow rate is very low (< 0.1 LPM), results may be unreliable',
        severity: 'warning',
        value: flowRate
      }
    }

    if (flowRate > 1000) {
      return {
        field: 'flow_rate_lpm',
        message: 'Flow rate exceeds typical maximum (1000 LPM)',
        severity: 'warning',
        value: flowRate
      }
    }

    return null
  }

  /**
   * Cross-parameter validation (checks involving multiple parameters)
   */
  private validateCrossParameters(parameters: ProcessParameters): ValidationError[] {
    const warnings: ValidationError[] = []

    // Check for extremely high velocity
    if (parameters.pipe_diameter_mm && parameters.flow_rate_lpm) {
      const radiusM = parameters.pipe_diameter_mm / 2 / 1000
      const flowM3S = parameters.flow_rate_lpm / 60 / 1000
      const velocityMS = flowM3S / (Math.PI * radiusM * radiusM)

      if (velocityMS > 10) {
        warnings.push({
          field: 'flow_rate_lpm',
          message: `Velocity is very high (${velocityMS.toFixed(2)} m/s), may cause excessive pressure drop`,
          severity: 'warning',
          value: velocityMS
        })
      }
    }

    // Check for very low Reynolds number (potential laminar flow issues)
    if (parameters.pipe_diameter_mm && parameters.flow_rate_lpm) {
      const diameterM = parameters.pipe_diameter_mm / 1000
      const flowM3S = parameters.flow_rate_lpm / 60 / 1000
      const velocityMS = flowM3S / (Math.PI * Math.pow(diameterM / 2, 2))
      const reynoldsApprox = (1000 * velocityMS * diameterM) / 1000 // Assuming ~1000 kg/m³ and ~1000 cp

      if (reynoldsApprox < 1) {
        warnings.push({
          field: 'flow_rate_lpm',
          message: 'Flow rate is very low, viscosity may dominate calculations',
          severity: 'warning',
          value: reynoldsApprox
        })
      }
    }

    return warnings
  }

  /**
   * Validate a single field
   */
  validateField(field: string, value: any): ValidationError | null {
    switch (field) {
      case 'pipe_length_mm':
        return this.validatePipeLength(value)
      case 'pipe_diameter_mm':
        return this.validatePipeDiameter(value)
      case 'material_key':
        return this.validateMaterial(value)
      case 'temperature_c':
        return this.validateTemperature(value)
      case 'flow_rate_lpm':
        return this.validateFlowRate(value)
      default:
        return null
    }
  }

  /**
   * Get human-readable error messages
   */
  getErrorMessage(error: ValidationError): string {
    return error.message
  }

  /**
   * Check if any critical errors exist
   */
  hasCriticalErrors(result: ValidationResult): boolean {
    return result.errors.length > 0
  }

  /**
   * Check if any warnings exist
   */
  hasWarnings(result: ValidationResult): boolean {
    return result.warnings.length > 0
  }
}

/**
 * Export singleton instance
 */
export function createValidationService(): ValidationService {
  return new ValidationService()
}
