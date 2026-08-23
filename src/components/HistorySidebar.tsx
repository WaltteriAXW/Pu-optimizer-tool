import { useEffect, useId, useRef } from 'react'
import { Trash2, Clock, ChevronRight } from 'lucide-react'
import { DatasetPanel } from './DatasetPanel'
import {
  SHOT_OUTCOME_LABEL,
  isLabelled,
  type ShotRecord,
  type ShotOutcome,
} from '../services/ShotRecordStore'

/**
 * A past run.
 *
 * This file used to declare its own HistoryEntry with `timestamp: Date`, alongside a second
 * declaration in CalculatorContext — two shapes for one thing, which is how the material
 * tables went wrong. There is one now, and it is the stored record.
 */
export type HistoryEntry = ShotRecord

interface HistorySidebarProps {
  history: HistoryEntry[]
  onSelectEntry: (entry: HistoryEntry) => void
  onDeleteEntry: (id: string) => void
  onRecordOutcome: (id: string, outcome: ShotOutcome) => void
  isOpen: boolean
  /** Close the panel — Escape and the backdrop both need it */
  onClose: () => void
}

/**
 * Results history sidebar showing past calculations.
 *
 * It overlays the page behind a backdrop, so it is a modal dialog and is described as one:
 * Escape closes it, focus moves into it when it opens and returns to whatever opened it
 * when it closes, and Tab cycles within it rather than wandering into the page underneath.
 * Claiming `aria-modal` without confining focus would describe a modality the panel did not
 * actually have.
 */
export function HistorySidebar({
  history,
  onSelectEntry,
  onDeleteEntry,
  onRecordOutcome,
  isOpen,
  onClose,
}: HistorySidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return

    // Whatever had focus when the panel opened gets it back on close
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      )

    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const elements = focusable()
      if (elements.length === 0) {
        event.preventDefault()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement

      // Wrap at both ends, and pull focus back in if it has escaped the panel entirely
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (active instanceof Node && !panelRef.current?.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const labelled = history.filter(isLabelled).length

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200 shadow-lg overflow-y-auto outline-none"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <Clock aria-hidden="true" className="w-5 h-5 text-indigo-600" />
          <h2 id={titleId} className="text-lg font-bold text-slate-800">
            Calculation History
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {history.length} run{history.length !== 1 ? 's' : ''} saved
          {history.length > 0 && (
            <> · {labelled} with a recorded outcome</>
          )}
        </p>
      </div>

      {/* Moving the dataset between browsers */}
      <div className="p-4 pb-0">
        <DatasetPanel />
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="p-6 text-center">
          <Clock aria-hidden="true" className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No runs saved yet</p>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {history.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onSelect={() => onSelectEntry(entry)}
              onDelete={() => onDeleteEntry(entry.id)}
              onRecordOutcome={(outcome) => onRecordOutcome(entry.id, outcome)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Individual history entry component
 */
function HistoryItem({
  entry,
  onSelect,
  onDelete,
  onRecordOutcome,
}: {
  entry: HistoryEntry
  onSelect: () => void
  onDelete: () => void
  onRecordOutcome: (outcome: ShotOutcome) => void
}) {
  const outcomeId = useId()
  const timeAgo = getTimeAgo(entry.timestamp)
  const pressure = entry.results.pressure?.base_pressure_drop_bar?.toFixed(2)
  const flowRegime = entry.results.flow?.flow_regime
  const materialName = entry.results.input?.material_name || entry.parameters.material_key

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50 transition-colors group">
      {/* Main content */}
      <button
        onClick={onSelect}
        // The visible text is a stack of styled fragments; spelled out here so the control
        // announces what loading it will do rather than reading as a run of numbers
        aria-label={`Load run: ${materialName}, ${timeAgo}${
          pressure ? `, ${pressure} bar` : ''
        }`}
        className="w-full text-left flex items-start justify-between mb-2"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {materialName}
          </p>
          <p className="text-xs text-slate-500 mt-1">{timeAgo}</p>

          {/* Summary stats */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            {pressure && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                {pressure} bar
              </span>
            )}
            {flowRegime && (
              <span
                className={`px-2 py-1 rounded capitalize ${
                  flowRegime === 'laminar'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {flowRegime}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          aria-hidden="true"
          className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 flex-shrink-0 mt-1 ml-2"
        />
      </button>

      {/* Parameters preview */}
      <div className="text-xs text-slate-600 space-y-0.5 mb-3 bg-white p-2 rounded border border-slate-100">
        <div className="flex justify-between">
          <span>Length:</span>
          <span className="font-medium">{entry.parameters.pipe_length_mm} mm</span>
        </div>
        <div className="flex justify-between">
          <span>Diameter:</span>
          <span className="font-medium">{entry.parameters.pipe_diameter_mm} mm</span>
        </div>
        <div className="flex justify-between">
          <span>Temp:</span>
          <span className="font-medium">{entry.parameters.temperature_c}°C</span>
        </div>
        <div className="flex justify-between">
          <span>Flow:</span>
          <span className="font-medium">{entry.parameters.flow_rate_lpm} LPM</span>
        </div>
      </div>

      {/* How the part came out. Recorded after the fact, which is the point: this is the
          one field the physics cannot supply and a model would need. */}
      <div className="mb-3" data-testid="outcome-picker">
        <label htmlFor={outcomeId} className="block text-xs font-semibold text-slate-600 mb-1">
          How did the part come out?
        </label>
        <select
          id={outcomeId}
          value={entry.outcome}
          onChange={(e) => onRecordOutcome(e.target.value as ShotOutcome)}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
        >
          {(Object.keys(SHOT_OUTCOME_LABEL) as ShotOutcome[]).map((value) => (
            <option key={value} value={value}>
              {SHOT_OUTCOME_LABEL[value]}
            </option>
          ))}
        </select>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        // Several "Delete" buttons sit in this list; without naming the run they are
        // indistinguishable when tabbed through
        aria-label={`Delete run: ${materialName}, ${timeAgo}`}
        className="w-full py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-1"
      >
        <Trash2 aria-hidden="true" className="w-3 h-3" />
        Delete
      </button>
    </div>
  )
}

/**
 * Format an ISO timestamp as "X minutes ago".
 *
 * Records are stored as ISO strings rather than Date objects because a Date does not survive
 * a round trip through JSON, and these are exported to be pooled across machines.
 */
function getTimeAgo(timestamp: string): string {
  const then = new Date(timestamp).getTime()
  if (Number.isNaN(then)) return 'unknown time'

  const diffMins = Math.floor((Date.now() - then) / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
