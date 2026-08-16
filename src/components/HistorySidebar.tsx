import type { CalculationResults, ProcessParameters } from '@/calculator_types'
import { Trash2, Clock, ChevronRight } from 'lucide-react'

export interface HistoryEntry {
  id: string
  timestamp: Date
  parameters: ProcessParameters
  results: CalculationResults
}

interface HistorySidebarProps {
  history: HistoryEntry[]
  onSelectEntry: (entry: HistoryEntry) => void
  onDeleteEntry: (id: string) => void
  isOpen: boolean
}

/**
 * Results history sidebar showing past calculations
 */
export function HistorySidebar({
  history,
  onSelectEntry,
  onDeleteEntry,
  isOpen,
}: HistorySidebarProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200 shadow-lg overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Calculation History</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {history.length} calculation{history.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="p-6 text-center">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No calculation history yet</p>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {history
            .slice()
            .reverse()
            .map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                onSelect={() => onSelectEntry(entry)}
                onDelete={() => onDeleteEntry(entry.id)}
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
}: {
  entry: HistoryEntry
  onSelect: () => void
  onDelete: () => void
}) {
  const timeAgo = getTimeAgo(entry.timestamp)
  const pressure = entry.results.pressure?.base_pressure_drop_bar?.toFixed(2)
  const flowRegime = entry.results.flow?.flow_regime

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50 transition-colors group">
      {/* Main content */}
      <button
        onClick={onSelect}
        className="w-full text-left flex items-start justify-between mb-2"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {entry.parameters.material_key}
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
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 flex-shrink-0 mt-1 ml-2" />
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

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="w-full py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-1"
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    </div>
  )
}

/**
 * Format timestamp to "X minutes ago" format
 */
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
