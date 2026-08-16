/**
 * Services - Business logic facades
 * Each service abstracts a specific domain and provides a clean interface
 */

// Calculation Service
export { CalculationService, createCalculationService } from './CalculationService'
export type { PyodideManager } from './CalculationService'

// Export Service
export { ExportService, createExportService } from './ExportService'
export type { ExportOptions } from './ExportService'

// Material Provider
export { getDefaultMaterialProvider, setDefaultMaterialProvider, createMaterialProvider } from './MaterialProvider'
export type { MaterialProperties, IMaterialProvider } from './MaterialProvider'

/**
 * Services implemented:
 * ✅ CalculationService (calculation orchestration)
 * ✅ ExportService (results export)
 * ✅ MaterialProvider (material database access)
 *
 * Input validation lives in two places by design: CalculationService.validateParameters
 * for quick client-side feedback, and src/core/validation on the Python side, which is
 * authoritative.
 */
