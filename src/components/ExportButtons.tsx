import { useId, useMemo, useState } from 'react'
import { ExportService } from '../services/ExportService'
import { generateReport } from '../utils/generateReport'
import { useCalculator } from '../context/CalculatorContext'
import type { CalculationResults } from '@/calculator_types'
import { AlertCircle, Download, FileJson, FileText, Loader } from 'lucide-react'

/**
 * The four exports are four equal choices, so they share one neutral style. They used to be
 * indigo, green, orange and teal, which suggested meanings the formats do not have.
 */
const EXPORT_BUTTON =
  'inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors'

interface ExportButtonsProps {
  results: CalculationResults
}

export function ExportButtons({ results }: ExportButtonsProps) {
  // One instance for the life of the component rather than a new one on every render
  const exportService = useMemo(() => new ExportService(), [])
  const { pressureUnit } = useCalculator()
  const labelId = useId()
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
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      {/* Wraps rather than running off a phone screen, where the PDF button used to be cut
          off at the edge */}
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
        {/* One visible label for the row, so each button reads as "Export JSON" without
            repeating the verb four times */}
        <span id={labelId} className="mr-1 text-sm font-medium text-slate-500">
          Export
        </span>
        <button
          onClick={() => handleExport('json')}
          className={EXPORT_BUTTON}
          title="Export as JSON"
        >
          <FileJson aria-hidden="true" className="w-4 h-4" />
          JSON
        </button>

        <button
          onClick={() => handleExport('csv')}
          className={EXPORT_BUTTON}
          title="Export as CSV"
        >
          <FileText aria-hidden="true" className="w-4 h-4" />
          CSV
        </button>

        <button
          onClick={() => handleExport('report')}
          className={EXPORT_BUTTON}
          title="Export as Text Report"
        >
          <Download aria-hidden="true" className="w-4 h-4" />
          Report
        </button>

        <button
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF}
          className={`${EXPORT_BUTTON} disabled:opacity-50 disabled:cursor-not-allowed`}
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
