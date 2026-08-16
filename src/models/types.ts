/**
 * Type definitions re-exported from calculator_types.ts
 * This module serves as the single source of truth for all type definitions
 * and constants used throughout the application.
 */

// Interfaces must be re-exported as types under isolatedModules
export type {
  ProcessParameters,
  PressurePoint,
  CalculationResults,
  EnvironmentalImpact,
  ProductionLogEntry,
  CalculatorState
} from '@/calculator_types'

// Runtime values (constants and error classes)
export {
  BLOWING_AGENT_DATA,
  ValidationError,
  PyodideError
} from '@/calculator_types'

// Export type alias for CalculationError
export type CalculationError = Error
