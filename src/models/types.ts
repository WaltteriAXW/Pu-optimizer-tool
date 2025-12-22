/**
 * Type definitions re-exported from calculator_types.ts
 * This module serves as the single source of truth for all type definitions
 * and constants used throughout the application.
 */

// Re-export all types from calculator_types
export {
  ProcessParameters,
  PressurePoint,
  CalculationResults,
  EnvironmentalImpact,
  ProductionLogEntry,
  CalculatorState,
  DEFAULT_ECOFOAM_PARAMETERS,
  DEFAULT_ISOCYANATE_PARAMETERS,
  BLOWING_AGENT_DATA,
  MATERIAL_CONSTANTS,
  ValidationError,
  PyodideError
} from '@/calculator_types'

// Export type alias for CalculationError
export type CalculationError = Error
