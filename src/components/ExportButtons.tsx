import { useState } from 'react'
import { ExportService } from '../services/ExportService'
import { generateReport } from '../utils/generateReport'
import type { CalculationResults, ProcessParameters } from '@/calculator_types'
import { Download, FileJson, FileText, Loader } from 'lucide-react'

interface ExportButtonsProps {
  results: CalculationResults
  params: ProcessParameters
}

export function ExportButtons({ results, params }: ExportButtonsProps) {
  const exportService = new ExportService()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleExport = (format: 'json' | 'csv' | 'report') => {
    try {
      const content = exportService.export(results, {
        format,
        includeTimestamp: true,
        prettyPrint: true,
      })
      const filename = exportService.generateFilename(format)
      const blob = new Blob([content], {
        type: exportService.getMimeType(format),
      })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export results')
    }
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Find the chart element in the DOM
      const chartElement = document.querySelector('[data-chart="pressure-profile"]') as HTMLElement | null

      // Map parameters to input data format. Values are taken from the result rather than
      // the form where the engine derived them — the density in particular, which used to
      // be hardcoded to 1000 kg/m³ for every material.
      const inputData = {
        pipeLength: results.input?.pipe_length_mm ?? params.pipe_length_mm ?? 0,
        pipeDiameter: results.input?.pipe_diameter_mm ?? params.pipe_diameter_mm ?? 0,
        temperature: results.input?.temperature_c ?? params.temperature_c ?? 0,
        flowRate: results.input?.flow_rate_lpm ?? params.flow_rate_lpm ?? 0,
        viscosity: results.flow?.apparent_viscosity_cp ?? 0,
        density: results.input?.material_density_kg_m3 ?? 0,
        selectedMaterial: results.input?.material_name || params.material_key || 'Unknown',
        selectedMachine: params.machine_type || 'Unknown',
      }

      // Map calculation results to output format. Each pressure is passed in bar under a
      // name matching what it is; the Pascal value is deliberately not passed at all.
      const machine = results.machine_compatibility
      const resultData = {
        setPressureBar: machine?.set_pressure_bar,
        setPressureGovernedBy: machine?.set_pressure_governed_by,
        requiredPressureBar: machine?.required_pressure_bar,
        basePressureDropBar: results.pressure?.base_pressure_drop_bar,
        pressureWithFittingsBar: results.pressure?.pressure_with_fittings_bar,
        fittingLossBar: results.pressure?.fitting_loss_bar,
        minPressureBar: machine?.min_pressure_bar,
        maxPressureBar: machine?.max_pressure_bar,
        reynoldsNumber: results.flow?.reynolds_number,
        flowRegime: results.flow?.flow_regime,
        velocity: results.flow?.velocity_m_s,
        shearRate: results.flow?.shear_rate_s_inv,
        compatible: machine?.is_compatible ?? false,
        machineType: results.input?.machine_type ?? params.machine_type,
      }

      // Generate the PDF with chart if available
      await generateReport(inputData, resultData, chartElement || undefined)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF report')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleExport('json')}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
        title="Export as JSON"
      >
        <FileJson className="w-4 h-4" />
        JSON
      </button>

      <button
        onClick={() => handleExport('csv')}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
        title="Export as CSV"
      >
        <FileText className="w-4 h-4" />
        CSV
      </button>

      <button
        onClick={() => handleExport('report')}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
        title="Export as Text Report"
      >
        <Download className="w-4 h-4" />
        Report
      </button>

      <button
        onClick={handleGeneratePDF}
        disabled={isGeneratingPDF}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Generate professional PDF report with charts"
      >
        {isGeneratingPDF ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isGeneratingPDF ? 'Generating...' : 'PDF'}
      </button>
    </div>
  )
}
