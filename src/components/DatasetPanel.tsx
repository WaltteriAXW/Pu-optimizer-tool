import { useRef, useState } from 'react'
import { Download, Upload, Database } from 'lucide-react'
import { useCalculator } from '../context/CalculatorContext'
import {
  exportRecords,
  importRecords,
  getLabelledRecords,
  type ImportSummary,
} from '../services/ShotRecordStore'

/**
 * Moving the recorded dataset between browsers.
 *
 * The application is a static site with no backend, so every run is stored in the browser
 * that calculated it. Exporting to a file and importing elsewhere is what turns several
 * private piles into one dataset — without hosting, accounts, or the app losing its property
 * of running entirely offline.
 */

/** Labelled shots needed before a model could say anything worth hearing. */
export const MIN_LABELLED_FOR_MODEL = 50

export function DatasetPanel() {
  const { history, refreshHistory } = useCalculator()
  const fileInput = useRef<HTMLInputElement>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const labelled = getLabelledRecords().length
  const shortfall = Math.max(0, MIN_LABELLED_FOR_MODEL - labelled)

  const handleExport = () => {
    const payload = exportRecords()
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pu-shots-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    setError(null)
    setSummary(null)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const result = importRecords(parsed)
      setSummary(result)
      refreshHistory()
    } catch {
      setError('That file could not be read as a shot dataset.')
    }
  }

  return (
    <div className="card" data-testid="dataset-panel">
      <div className="card-header flex items-center gap-2">
        <Database className="w-4 h-4 text-slate-600" />
        <h4 className="font-bold text-slate-800">Shot dataset</h4>
      </div>
      <div className="card-body space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-600">Runs saved in this browser</span>
          <span className="text-sm font-semibold tabular-nums">{history.length}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-600">With a recorded outcome</span>
          <span className="text-sm font-semibold tabular-nums">{labelled}</span>
        </div>

        {/* The honest statement of where this stands. Saying anything more confident with
            a handful of shots is exactly the failure the removed neural network embodied. */}
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          {shortfall > 0 ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">No model yet.</strong> A prediction would
              need at least {MIN_LABELLED_FOR_MODEL} shots with recorded outcomes —{' '}
              {shortfall} more than there are now. Until then the physics is the only thing
              answering, which is the honest state of affairs rather than a limitation to
              work around.
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">{labelled} labelled shots.</strong> Enough
              to start checking where the physics and the parts disagree.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={history.length === 0}
            className="button-secondary flex-1 text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="button-secondary flex-1 text-sm"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ''
            }}
          />
        </div>

        {summary && (
          <p className="text-xs text-slate-600" data-testid="import-summary">
            Imported {summary.added} new run{summary.added === 1 ? '' : 's'}
            {summary.duplicates > 0 && <>, skipped {summary.duplicates} already held</>}
            {summary.rejected > 0 && <>, rejected {summary.rejected} unreadable</>}.
          </p>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </div>
  )
}
