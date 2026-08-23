import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Database, Brain, Trash2 } from 'lucide-react'
import { useCalculator } from '../context/CalculatorContext'
import {
  exportRecords,
  importRecords,
  getLabelledRecords,
  type ImportSummary,
} from '../services/ShotRecordStore'
import type {
  ModelReadiness,
  TrainingResult,
} from '../services/ResidualModelService'

/**
 * Moving the recorded dataset between browsers.
 *
 * The application is a static site with no backend, so every run is stored in the browser
 * that calculated it. Exporting to a file and importing elsewhere is what turns several
 * private piles into one dataset — without hosting, accounts, or the app losing its property
 * of running entirely offline.
 */

export function DatasetPanel() {
  const { history, refreshHistory, clearHistory, isReady, checkModelReadiness, trainModel } =
    useCalculator()
  const fileInput = useRef<HTMLInputElement>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [training, setTraining] = useState(false)
  const [trained, setTrained] = useState<TrainingResult | null>(null)
  const [trainError, setTrainError] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<ModelReadiness | null>(null)
  // Two-step, because this is the one irreversible action in the application and the data
  // it destroys cannot be recalculated — an outcome someone recorded by looking at a part
  // exists nowhere else.
  const [confirmingClear, setConfirmingClear] = useState(false)

  // The threshold lives in core/learning/residual_model.py and is asked for rather than
  // restated here. A second copy in TypeScript would be one more number to keep in step,
  // which is how the material tables and the validation ranges went wrong.
  useEffect(() => {
    if (!isReady) return
    let cancelled = false
    checkModelReadiness()
      .then(result => {
        if (!cancelled) setReadiness(result)
      })
      .catch(() => {
        // Readiness is a nicety; failing to fetch it must not break the panel
      })
    return () => {
      cancelled = true
    }
  }, [isReady, checkModelReadiness, history])

  const labelled = getLabelledRecords().length

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

  const handleTrain = async () => {
    setTraining(true)
    setTrainError(null)
    setTrained(null)
    try {
      setTrained(await trainModel())
    } catch (err) {
      // The expected outcome for a long time: not enough labelled shots. Shown as the
      // shortfall it is, rather than as a failure.
      setTrainError(err instanceof Error ? err.message : 'Training failed')
    } finally {
      setTraining(false)
    }
  }

  return (
    <div className="card" data-testid="dataset-panel">
      <div className="card-header flex items-center gap-2">
        <Database aria-hidden="true" className="w-4 h-4 text-slate-600" />
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
          {readiness?.ready ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">
                {readiness.labelled} labelled shots.
              </strong>{' '}
              Enough to start checking where the physics and the parts disagree.
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">No model yet.</strong>{' '}
              {readiness
                ? `${readiness.reasons.join('; ')}.`
                : 'A prediction needs shots whose outcome someone has recorded.'}{' '}
              Until then the physics is the only thing answering, which is the honest state
              of affairs rather than a limitation to work around.
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
            <Download aria-hidden="true" className="w-4 h-4 mr-1.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="button-secondary flex-1 text-sm"
          >
            <Upload aria-hidden="true" className="w-4 h-4 mr-1.5" />
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

        {/* Training is only offered once it could do anything. Loading several megabytes
            of scikit-learn to be told there are four shots would be a poor trade. */}
        {readiness?.ready && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => void handleTrain()}
              disabled={training}
              className="button-primary w-full text-sm disabled:opacity-50"
              data-testid="train-model"
            >
              <Brain aria-hidden="true" className="w-4 h-4 mr-1.5" />
              {training ? 'Training…' : 'Train on recorded shots'}
            </button>
            {trained && (
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">
                  {(trained.accuracy * 100).toFixed(0)}% on {trained.held_out} held-out shots
                </p>
                <p className="leading-relaxed">{trained.caveat}</p>
              </div>
            )}
            {trainError && <p className="mt-2 text-xs text-amber-800">{trainError}</p>}
          </div>
        )}

        {/* Clearing the browser's saved runs. The store could always do this; there was
            simply no way to ask for it, so a dataset once recorded could not be discarded
            from inside the application at all. */}
        {history.length > 0 && (
          <div className="pt-1 border-t border-slate-100">
            {confirmingClear ? (
              <div className="space-y-2" data-testid="clear-confirm">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Delete all {history.length} saved run
                  {history.length === 1 ? '' : 's'}
                  {labelled > 0 && <>, including {labelled} with a recorded outcome</>}? This
                  cannot be undone — export first if you want to keep them.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearHistory()
                      setConfirmingClear(false)
                      setSummary(null)
                      setTrained(null)
                    }}
                    className="flex-1 text-xs px-3 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Delete everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="flex-1 button-secondary text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                data-testid="clear-dataset"
                className="w-full text-xs px-3 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                Clear saved runs
              </button>
            )}
          </div>
        )}

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
