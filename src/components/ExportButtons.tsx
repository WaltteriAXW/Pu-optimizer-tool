import { useMemo, useState } from 'react'
import { ExportService } from '../services/ExportService'
import { generateReport } from '../utils/generateReport'
import { useCalculator } from '../context/CalculatorContext'
import type { CalculationResults } from '@/calculator_types'
import { AlertCircle, Download, FileJson, FileText, Loader } from 'lucide-react'

interface ExportButtonsProps {
  results: CalculationResults
}

export function ExportButtons({ results }: ExportButtonsProps) {
  // One instance for the life of the component rather than a new one on every render
  const exportService = useMemo(() => new ExportService(), [])
  const { pressureUnit } = useCalculator()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = (format: 'json' | 'csv' | 'report') => {
    setError(null)
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
    } catch (err) {
      console.error('Export failed:', err)
      // An inline message rather than alert(), which interrupts and looks nothing like
      // the rest of the interface
      setError('That export could not be produced.')
    }
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    setError(null)
    try {
      const chartElement = document.querySelector(
        '[data-chart="pressure-profile"]'
      ) as HTMLElement | null

      // The whole result goes across. It used to be flattened into a handful of named
      // fields, which is how the report ended up showing less than the screen did.
      await generateReport(results, {
        unit: pressureUnit,
        chartElement: chartElement ?? undefined,
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError('The PDF could not be generated. The other formats still work.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div role="group" aria-label="Export results" className="flex items-center gap-2">
        <button
          onClick={() => handleExport('json')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
          title="Export as JSON"
        >
          <FileJson aria-hidden="true" className="w-4 h-4" />
          JSON
        </button>

        <button
          onClick={() => handleExport('csv')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
          title="Export as CSV"
        >
          <FileText aria-hidden="true" className="w-4 h-4" />
          CSV
        </button>

        <button
          onClick={() => handleExport('report')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          title="Export as Text Report"
        >
          <Download aria-hidden="true" className="w-4 h-4" />
          Report
        </button>

        <button
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate professional PDF report with charts"
        >
          {isGeneratingPDF ? (
            <Loader aria-hidden="true" className="w-4 h-4 animate-spin" />
          ) : (
            <Download aria-hidden="true" className="w-4 h-4" />
          )}
          {isGeneratingPDF ? 'Generating...' : 'PDF'}
        </button>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle aria-hidden="true" className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}
