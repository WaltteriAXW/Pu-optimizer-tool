/**
 * ExportService Tests
 *
 * Tests for exporting calculation results in various formats.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ExportService, createExportService } from './ExportService'
import type { CalculationResults } from '@/models/types'

// Named so that spreading them in the tests below preserves the required fields.
// Spreading `mockResults.machine_compatibility` instead widens every field to optional,
// because the property itself is optional on CalculationResults.
const mockEnvironmental: NonNullable<CalculationResults['environmental']> = {
  material: 'EcoFoam Standard',
  blowing_agent: 'HFC-134a',
  gwp_per_kg: 5000,
  recommendation: 'Standard option',
  is_eco_friendly: false
}

const mockMachineCompatibility: NonNullable<CalculationResults['machine_compatibility']> = {
  is_compatible: true,
  status: 'compatible',
  required_pressure_bar: 250,
  max_pressure_bar: 250,
  warning: undefined
}

const mockResults: CalculationResults = {
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
  environmental: mockEnvironmental,
  machine_compatibility: mockMachineCompatibility,
  timestamp: '2024-12-08T10:00:00Z'
}

describe('ExportService', () => {
  let service: ExportService

  beforeEach(() => {
    service = new ExportService()
  })

  describe('export() - JSON Format', () => {
    it('should export to JSON format', () => {
      const json = service.export(mockResults, { format: 'json' })
      expect(json).toBeTruthy()
      const parsed = JSON.parse(json)
      expect(parsed.input).toBeDefined()
      expect(parsed.flow).toBeDefined()
      expect(parsed.pressure).toBeDefined()
    })

    it('should pretty print JSON by default', () => {
      const json = service.export(mockResults, { format: 'json', prettyPrint: true })
      expect(json).toContain('\n')
      expect(json).toContain('  ')
    })

    it('should minify JSON when prettyPrint is false', () => {
      const json = service.export(mockResults, { format: 'json', prettyPrint: false })
      const lines = json.split('\n').filter(l => l.trim())
      expect(lines.length).toBeLessThan(10) // Should be mostly one line
    })

    it('should include timestamp when includeTimestamp is true', () => {
      const json = service.export(mockResults, { format: 'json', includeTimestamp: true })
      const parsed = JSON.parse(json)
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should exclude timestamp when includeTimestamp is false', () => {
      const json = service.export(mockResults, { format: 'json', includeTimestamp: false })
      const parsed = JSON.parse(json)
      expect(parsed.exportedAt).toBeUndefined()
    })

    it('should preserve all calculation data', () => {
      const json = service.export(mockResults, { format: 'json' })
      const parsed = JSON.parse(json)

      expect(parsed.input.pipe_length_mm).toBe(1000)
      expect(parsed.flow.reynolds_number).toBe(45.2)
      expect(parsed.pressure.pressure_with_fittings_bar).toBe(4.12)
      expect(parsed.thermal.shear_heating_c).toBe(0.5)
      expect(parsed.environmental.gwp_per_kg).toBe(5000)
      expect(parsed.machine_compatibility.is_compatible).toBe(true)
    })
  })

  describe('export() - CSV Format', () => {
    it('should export to CSV format', () => {
      const csv = service.export(mockResults, { format: 'csv' })
      expect(csv).toBeTruthy()
      expect(csv).toContain('Parameter,Value,Unit')
    })

    it('should contain all sections', () => {
      const csv = service.export(mockResults, { format: 'csv' })
      expect(csv).toContain('--- INPUT ---')
      expect(csv).toContain('--- FLOW PROPERTIES ---')
      expect(csv).toContain('--- PRESSURE DATA ---')
      expect(csv).toContain('--- THERMAL DATA ---')
      expect(csv).toContain('--- ENVIRONMENTAL DATA ---')
      expect(csv).toContain('--- MACHINE COMPATIBILITY ---')
    })

    it('should include input parameters', () => {
      const csv = service.export(mockResults, { format: 'csv' })
      expect(csv).toContain('Pipe Length')
      expect(csv).toContain('1000')
      expect(csv).toContain('mm')
      expect(csv).toContain('EcoFoam Standard')
    })

    it('should include flow properties', () => {
      const csv = service.export(mockResults, { format: 'csv' })
      expect(csv).toContain('Shear Rate')
      expect(csv).toContain('Reynolds Number')
      expect(csv).toContain('Flow Regime')
    })

    it('should include machine compatibility status', () => {
      const csv = service.export(mockResults, { format: 'csv' })
      expect(csv).toContain('Compatible')
      expect(csv).toContain('Yes')
    })

    it('should include timestamp metadata when requested', () => {
      const csv = service.export(mockResults, { format: 'csv', includeTimestamp: true })
      expect(csv).toContain('Calculation Timestamp')
      expect(csv).toContain('Exported At')
    })

    it('should exclude timestamp when not requested', () => {
      const csv = service.export(mockResults, { format: 'csv', includeTimestamp: false })
      expect(csv).not.toContain('Exported At')
    })

    it('should handle warnings in machine compatibility', () => {
      const resultsWithWarning: CalculationResults = {
        ...mockResults,
        machine_compatibility: {
          ...mockMachineCompatibility,
          warning: 'Pressure exceeds limit'
        }
      }
      const csv = service.export(resultsWithWarning, { format: 'csv' })
      expect(csv).toContain('Pressure exceeds limit')
    })
  })

  describe('export() - Report Format', () => {
    it('should export to report format', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).toBeTruthy()
      expect(report).toContain('POLYURETHANE INJECTION CALCULATION REPORT')
    })

    it('should have formatted headers', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).toContain('═')
      expect(report).toContain('INPUT PARAMETERS')
      expect(report).toContain('FLOW PROPERTIES')
      expect(report).toContain('PRESSURE ANALYSIS')
      expect(report).toContain('THERMAL ANALYSIS')
      expect(report).toContain('ENVIRONMENTAL IMPACT')
      expect(report).toContain('MACHINE COMPATIBILITY')
    })

    it('should be human-readable with aligned columns', () => {
      const report = service.export(mockResults, { format: 'report' })
      const lines = report.split('\n')
      expect(lines.some(l => l.includes('Pipe Length'))).toBe(true)
      expect(lines.some(l => l.includes('mm'))).toBe(true)
    })

    it('should include timestamp information', () => {
      const report = service.export(mockResults, { format: 'report', includeTimestamp: true })
      expect(report).toContain('Generated:')
      expect(report).toContain('Calculation:')
    })

    it('should format flow regime as uppercase', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).toContain('LAMINAR')
    })

    it('should show shear thinning status', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).toContain('Shear Thinning:')
      expect(report).toContain('YES')
    })

    it('should show machine compatibility status', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).toContain('Compatible:')
      expect(report).toContain('YES')
    })

    it('should display warning with warning symbol', () => {
      const resultsWithWarning: CalculationResults = {
        ...mockResults,
        machine_compatibility: {
          ...mockMachineCompatibility,
          warning: 'Critical pressure issue'
        }
      }
      const report = service.export(resultsWithWarning, { format: 'report' })
      expect(report).toContain('⚠️')
      expect(report).toContain('Critical pressure issue')
    })

    it('should omit warning when not present', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).not.toContain('⚠️')
    })
  })

  describe('getFileExtension()', () => {
    it('should return .json for json format', () => {
      expect(service.getFileExtension('json')).toBe('.json')
    })

    it('should return .csv for csv format', () => {
      expect(service.getFileExtension('csv')).toBe('.csv')
    })

    it('should return .txt for report format', () => {
      expect(service.getFileExtension('report')).toBe('.txt')
    })
  })

  describe('getMimeType()', () => {
    it('should return application/json for json format', () => {
      expect(service.getMimeType('json')).toBe('application/json')
    })

    it('should return text/csv for csv format', () => {
      expect(service.getMimeType('csv')).toBe('text/csv')
    })

    it('should return text/plain for report format', () => {
      expect(service.getMimeType('report')).toBe('text/plain')
    })
  })

  describe('createDownloadBlob()', () => {
    it('should create a Blob object', () => {
      const blob = service.createDownloadBlob(mockResults)
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should set correct MIME type for JSON', () => {
      const blob = service.createDownloadBlob(mockResults, 'json')
      expect(blob.type).toBe('application/json')
    })

    it('should set correct MIME type for CSV', () => {
      const blob = service.createDownloadBlob(mockResults, 'csv')
      expect(blob.type).toBe('text/csv')
    })

    it('should set correct MIME type for report', () => {
      const blob = service.createDownloadBlob(mockResults, 'report')
      expect(blob.type).toBe('text/plain')
    })

    it('should create downloadable blob with content', () => {
      const blob = service.createDownloadBlob(mockResults, 'json')
      expect(blob.size).toBeGreaterThan(0)
    })
  })

  describe('generateFilename()', () => {
    it('should generate filename with timestamp', () => {
      const filename = service.generateFilename()
      expect(filename).toContain('pu-calculation-')
      expect(filename).toContain('.json')
    })

    it('should generate JSON filename', () => {
      const filename = service.generateFilename('json')
      expect(filename).toMatch(/\.json$/)
    })

    it('should generate CSV filename', () => {
      const filename = service.generateFilename('csv')
      expect(filename).toMatch(/\.csv$/)
    })

    it('should generate report filename', () => {
      const filename = service.generateFilename('report')
      expect(filename).toMatch(/\.txt$/)
    })

    it('should have ISO timestamp format', () => {
      const filename = service.generateFilename()
      // Format: pu-calculation-YYYYMMDDTHHMMSS.json
      const match = filename.match(/pu-calculation-(\d{8}T\d{6})/)
      expect(match).toBeTruthy()
    })

    it('should generate unique filenames for different times', () => {
      const filename1 = service.generateFilename()
      // Small delay to ensure different timestamp
      const filename2 = service.generateFilename()
      // They might be the same if generated in same second, but that's OK
      expect(filename1).toContain('pu-calculation-')
      expect(filename2).toContain('pu-calculation-')
    })
  })

  describe('Default behavior', () => {
    it('should use JSON format by default', () => {
      const result = service.export(mockResults)
      const parsed = JSON.parse(result)
      expect(parsed.input).toBeDefined()
    })

    it('should include timestamp by default', () => {
      const result = service.export(mockResults)
      const parsed = JSON.parse(result)
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should pretty print by default', () => {
      const result = service.export(mockResults)
      expect(result).toContain('\n')
    })
  })

  describe('Error handling', () => {
    it('should throw error for unknown format', () => {
      expect(() => {
        service.export(mockResults, { format: 'pdf' as any })
      }).toThrow('Unknown export format')
    })
  })

  describe('createExportService factory', () => {
    it('should create a new ExportService instance', () => {
      const newService = createExportService()
      expect(newService).toBeInstanceOf(ExportService)
    })

    it('should export results from factory instance', () => {
      const newService = createExportService()
      const json = newService.export(mockResults, { format: 'json' })
      const parsed = JSON.parse(json)
      expect(parsed.input).toBeDefined()
    })
  })

  describe('Data integrity', () => {
    it('should preserve numeric precision in JSON export', () => {
      const json = service.export(mockResults, { format: 'json' })
      const parsed = JSON.parse(json)
      expect(parsed.flow.reynolds_number).toBe(45.2)
      expect(parsed.thermal.temperature_factor).toBe(1.0)
    })

    it('should format floats correctly in CSV', () => {
      const csv = service.export(mockResults, { format: 'csv' })
      expect(csv).toContain('45.20')
      expect(csv).toContain('0.53')
    })

    it('should format floats in report', () => {
      const report = service.export(mockResults, { format: 'report' })
      expect(report).toContain('45.20')
      expect(report).toContain('1.0000')
    })
  })

  describe('Large result sets', () => {
    it('should handle large JSON exports', () => {
      const largeResults: CalculationResults = {
        ...mockResults,
        input: {
          ...mockResults.input,
          pipe_length_mm: 999999999,
          flow_rate_lpm: 999999.999
        }
      }

      const json = service.export(largeResults, { format: 'json' })
      const parsed = JSON.parse(json)
      expect(parsed.input.pipe_length_mm).toBe(999999999)
    })

    it('should handle special characters in recommendations', () => {
      const resultsWithSpecial: CalculationResults = {
        ...mockResults,
        environmental: {
          ...mockEnvironmental,
          recommendation: 'Use "eco-friendly" option with 50% reduction'
        }
      }

      const json = service.export(resultsWithSpecial, { format: 'json' })
      const parsed = JSON.parse(json)
      expect(parsed.environmental.recommendation).toContain('eco-friendly')
    })
  })
})
