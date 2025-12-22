import React from 'react'
import { ExportService } from '../services/ExportService'
import type { CalculationResults, ProcessParameters } from '@/calculator_types'
import { Download, FileJson, FileText } from 'lucide-react'

interface ExportButtonsProps {
  results: CalculationResults
  params: ProcessParameters
}

export function ExportButtons({ results, params }: ExportButtonsProps) {
  const exportService = new ExportService()

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
    </div>
  )
}
