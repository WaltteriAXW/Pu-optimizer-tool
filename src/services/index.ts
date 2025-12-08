/**
 * Services - Business logic facades
 * Each service abstracts a specific domain and provides a clean interface
 */

// Calculation Service
export { CalculationService, createCalculationService } from './CalculationService'
export type { default as ICalculationService } from './CalculationService'

// Validation Service
export { ValidationService, createValidationService } from './ValidationService'
export type { ValidationError, ValidationResult } from './ValidationService'

// Export Service
export { ExportService, createExportService } from './ExportService'
export type { ExportOptions } from './ExportService'

/**
 * Services implemented:
 * ✅ CalculationService (calculation orchestration)
 * ✅ ValidationService (input validation)
 * ✅ ExportService (results export)
 *
 * Services to implement:
 * - WarningService (warning generation & management)
 * - MLService (ML predictions & insights)
 * - DatabaseService (database access & caching)
 * - ReportService (advanced reporting)
 */
