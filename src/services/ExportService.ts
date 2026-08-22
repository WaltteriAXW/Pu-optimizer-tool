/**
 * ExportService - Export calculation results in various formats
 *
 * Handles exporting calculation results as JSON, CSV, and formatted reports.
 */

import type { CalculationResults } from '@/models/types'

export interface ExportOptions {
  format: 'json' | 'csv' | 'report'
  includeTimestamp: boolean
  prettyPrint: boolean
}

export class ExportService {
  /**
   * Export calculation results in the specified format
   */
  export(results: CalculationResults, options: Partial<ExportOptions> = {}): string {
    const opts: ExportOptions = {
      format: options.format || 'json',
      includeTimestamp: options.includeTimestamp !== false,
      prettyPrint: options.prettyPrint !== false
    }

    switch (opts.format) {
      case 'json':
        return this.exportToJSON(results, opts)
      case 'csv':
        return this.exportToCSV(results, opts)
      case 'report':
        return this.exportToReport(results, opts)
      default:
        throw new Error(`Unknown export format: ${opts.format}`)
    }
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(results: CalculationResults, options: ExportOptions): string {
    const data = {
      ...results,
      exportedAt: options.includeTimestamp ? new Date().toISOString() : undefined
    }

    if (!options.includeTimestamp) {
      delete data.exportedAt
    }

    if (options.prettyPrint) {
      return JSON.stringify(data, null, 2)
    } else {
      return JSON.stringify(data)
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(results: CalculationResults, options: ExportOptions): string {
    const rows: string[] = []

    // Header
    rows.push('Parameter,Value,Unit')

    // Input Data
    rows.push('--- INPUT ---,')
    rows.push(`Pipe Length,${results.input.pipe_length_mm},mm`)
    rows.push(`Pipe Diameter,${results.input.pipe_diameter_mm},mm`)
    rows.push(`Material,${results.input.material_name},`)
    rows.push(`Temperature,${results.input.temperature_c},°C`)
    rows.push(`Flow Rate,${results.input.flow_rate_lpm},LPM`)
    rows.push(`Machine Type,${results.input.machine_type},`)

    // Flow Properties
    rows.push('--- FLOW PROPERTIES ---,')
    rows.push(`Shear Rate,${results.flow.shear_rate_s_inv.toFixed(2)},s⁻¹`)
    rows.push(`Apparent Viscosity,${results.flow.apparent_viscosity_cp.toFixed(2)},cP`)
    rows.push(`Reynolds Number,${results.flow.reynolds_number.toFixed(2)},`)
    rows.push(`Flow Regime,${results.flow.flow_regime},`)
    rows.push(`Velocity,${results.flow.velocity_m_s.toFixed(3)},m/s`)
    rows.push(`Shear Thinning,${results.flow.is_shear_thinning ? 'Yes' : 'No'},`)

    // Pressure Data
    rows.push('--- PRESSURE DATA ---,')
    rows.push(`Base Pressure Drop,${results.pressure.base_pressure_drop_bar.toFixed(2)},bar`)
    rows.push(`Pressure Drop,${(results.pressure.pressure_drop_pa / 100000).toFixed(2)},bar`)
    rows.push(`With Fittings,${results.pressure.pressure_with_fittings_bar.toFixed(2)},bar`)
    rows.push(`Fitting Loss,${results.pressure.fitting_loss_bar.toFixed(2)},bar`)

    // Thermal Data
    const thermal = results.thermal
    if (thermal) {
      rows.push('--- THERMAL DATA ---,')
      rows.push(`Reference Temperature,${thermal.temperature_c},°C`)
      rows.push(`Reference Viscosity,${thermal.reference_viscosity_cp.toFixed(2)},cP`)
      rows.push(`Current Viscosity,${thermal.current_viscosity_cp.toFixed(2)},cP`)
      rows.push(`Temperature Factor,${thermal.temperature_factor.toFixed(4)},`)
      rows.push(`Shear Heating,${(thermal.shear_heating_c ?? 0).toFixed(2)},°C`)
      rows.push(`Heat Generated,${(thermal.heat_generated_w ?? 0).toFixed(2)},W`)
    }

    // Environmental Data
    const environmental = results.environmental
    if (environmental) {
      rows.push('--- ENVIRONMENTAL DATA ---,')
      rows.push(`Material,${environmental.material},`)
      rows.push(`Blowing Agent,${environmental.blowing_agent},`)
      rows.push(`GWP per kg,${environmental.gwp_per_kg},`)
      rows.push(`Eco-friendly,${environmental.is_eco_friendly ? 'Yes' : 'No'},`)
      rows.push(`Recommendation,${environmental.recommendation},`)
    }

    // Machine Compatibility
    const compatibility = results.machine_compatibility
    if (compatibility) {
      rows.push('--- MACHINE COMPATIBILITY ---,')
      rows.push(`Compatible,${compatibility.is_compatible ? 'Yes' : 'No'},`)
      rows.push(`Status,${compatibility.status},`)
      rows.push(`Line Demand,${compatibility.required_pressure_bar},bar`)
      rows.push(`Required Pressure (set point),${compatibility.set_pressure_bar},bar`)
      rows.push(`Set Point Governed By,${compatibility.set_pressure_governed_by},`)
      rows.push(`Min Pressure,${compatibility.min_pressure_bar},bar`)
      rows.push(`Max Pressure,${compatibility.max_pressure_bar},bar`)
      if (compatibility.warning) {
        rows.push(`Warning,${compatibility.warning},`)
      }
      if (compatibility.note) {
        rows.push(`Note,${compatibility.note},`)
      }
    }

    // Metadata
    if (options.includeTimestamp) {
      rows.push('--- EXPORT METADATA ---,')
      rows.push(`Calculation Timestamp,${results.timestamp},`)
      rows.push(`Exported At,${new Date().toISOString()},`)
    }

    return rows.join('\n')
  }

  /**
   * Export as formatted text report
   */
  private exportToReport(results: CalculationResults, options: ExportOptions): string {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('POLYURETHANE INJECTION CALCULATION REPORT')
    lines.push('═══════════════════════════════════════════════════════════════')

    if (options.includeTimestamp) {
      lines.push(`\nGenerated: ${new Date().toLocaleString()}`)
      // timestamp is optional, and new Date(undefined) renders as "Invalid Date" —
      // say the value is absent rather than printing something that looks like a fault
      lines.push(
        `Calculation: ${
          results.timestamp ? new Date(results.timestamp).toLocaleString() : 'not recorded'
        }`
      )
    }

    // Input Section
    lines.push('\n' + '─'.repeat(63))
    lines.push('INPUT PARAMETERS')
    lines.push('─'.repeat(63))
    lines.push(`Pipe Length:        ${results.input.pipe_length_mm} mm`)
    lines.push(`Pipe Diameter:      ${results.input.pipe_diameter_mm} mm`)
    lines.push(`Material:           ${results.input.material_name} (${results.input.material_key})`)
    lines.push(`Temperature:        ${results.input.temperature_c}°C`)
    lines.push(`Flow Rate:          ${results.input.flow_rate_lpm} LPM`)
    lines.push(`Machine Type:       ${results.input.machine_type}`)

    // Flow Properties Section
    lines.push('\n' + '─'.repeat(63))
    lines.push('FLOW PROPERTIES')
    lines.push('─'.repeat(63))
    lines.push(`Shear Rate:         ${results.flow.shear_rate_s_inv.toFixed(2)} s⁻¹`)
    lines.push(`Apparent Viscosity: ${results.flow.apparent_viscosity_cp.toFixed(2)} cP`)
    lines.push(`Reynolds Number:    ${results.flow.reynolds_number.toFixed(2)}`)
    lines.push(`Flow Regime:        ${results.flow.flow_regime.toUpperCase()}`)
    lines.push(`Velocity:           ${results.flow.velocity_m_s.toFixed(3)} m/s`)
    lines.push(`Shear Thinning:     ${results.flow.is_shear_thinning ? 'YES' : 'NO'}`)

    // Pressure Section
    lines.push('\n' + '─'.repeat(63))
    lines.push('PRESSURE ANALYSIS')
    lines.push('─'.repeat(63))
    lines.push(`Base Pressure Drop: ${results.pressure.base_pressure_drop_bar.toFixed(2)} bar`)
    lines.push(`Total Pressure:     ${results.pressure.pressure_with_fittings_bar.toFixed(2)} bar`)
    lines.push(`Fitting Loss:       ${results.pressure.fitting_loss_bar.toFixed(2)} bar`)

    // Thermal Section
    const thermal = results.thermal
    if (thermal) {
      lines.push('\n' + '─'.repeat(63))
      lines.push('THERMAL ANALYSIS')
      lines.push('─'.repeat(63))
      lines.push(`Reference Temp:     ${thermal.temperature_c}°C`)
      lines.push(`Reference Visc:     ${thermal.reference_viscosity_cp.toFixed(2)} cP`)
      lines.push(`Current Visc:       ${thermal.current_viscosity_cp.toFixed(2)} cP`)
      lines.push(`Temp Factor:        ${thermal.temperature_factor.toFixed(4)}`)
      lines.push(`Shear Heating:      ${(thermal.shear_heating_c ?? 0).toFixed(2)}°C`)
      lines.push(`Heat Generated:     ${(thermal.heat_generated_w ?? 0).toFixed(2)} W`)
    }

    // Environmental Section
    const environmental = results.environmental
    if (environmental) {
      lines.push('\n' + '─'.repeat(63))
      lines.push('ENVIRONMENTAL IMPACT')
      lines.push('─'.repeat(63))
      lines.push(`Material:           ${environmental.material}`)
      lines.push(`Blowing Agent:      ${environmental.blowing_agent}`)
      lines.push(`GWP (per kg):       ${environmental.gwp_per_kg}`)
      lines.push(`Eco-friendly:       ${environmental.is_eco_friendly ? 'YES' : 'NO'}`)
      lines.push(`Recommendation:     ${environmental.recommendation}`)
    }

    // Machine Compatibility Section
    const compatibility = results.machine_compatibility
    if (compatibility) {
      lines.push('\n' + '─'.repeat(63))
      lines.push('MACHINE COMPATIBILITY')
      lines.push('─'.repeat(63))
      lines.push(`Compatible:         ${compatibility.is_compatible ? 'YES' : 'NO'}`)
      lines.push(`Status:             ${compatibility.status}`)
      lines.push(`Line demand:        ${compatibility.required_pressure_bar} bar`)
      lines.push(`REQUIRED PRESSURE:  ${compatibility.set_pressure_bar} bar  (set this)`)
      lines.push(`  governed by:      ${compatibility.set_pressure_governed_by}`)
      lines.push(`Machine window:     ${compatibility.min_pressure_bar}-${compatibility.max_pressure_bar} bar`)
      if (compatibility.warning) {
        lines.push(`⚠️  WARNING:          ${compatibility.warning}`)
      }
      if (compatibility.note) {
        lines.push(`Note:               ${compatibility.note}`)
      }
    }

    lines.push('\n' + '═'.repeat(63))
    lines.push('END OF REPORT')
    lines.push('═'.repeat(63))

    return lines.join('\n')
  }

  /**
   * Get default file extension for format
   */
  getFileExtension(format: 'json' | 'csv' | 'report'): string {
    switch (format) {
      case 'json':
        return '.json'
      case 'csv':
        return '.csv'
      case 'report':
        return '.txt'
      default:
        return '.txt'
    }
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format: 'json' | 'csv' | 'report'): string {
    switch (format) {
      case 'json':
        return 'application/json'
      case 'csv':
        return 'text/csv'
      case 'report':
        return 'text/plain'
      default:
        return 'text/plain'
    }
  }

  /**
   * Generate a downloadable blob (for browser environments)
   */
  createDownloadBlob(results: CalculationResults, format: 'json' | 'csv' | 'report' = 'json'): Blob {
    const content = this.export(results, { format, includeTimestamp: true, prettyPrint: true })
    return new Blob([content], { type: this.getMimeType(format) })
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(format: 'json' | 'csv' | 'report' = 'json'): string {
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '')
    return `pu-calculation-${timestamp}${this.getFileExtension(format)}`
  }
}

/**
 * Export singleton instance factory
 */
export function createExportService(): ExportService {
  return new ExportService()
}
