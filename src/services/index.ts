/**
 * Services - Business logic facades
 * Each service abstracts a specific domain and provides a clean interface
 */

export { CalculationService, createCalculationService } from './CalculationService'
export type { default as ICalculationService } from './CalculationService'

/**
 * Other services to implement:
 * - ValidationService (validation logic)
 * - WarningService (warning generation)
 * - MLService (ML predictions)
 * - ExportService (report/CSV generation)
 * - DatabaseService (database access)
 */
