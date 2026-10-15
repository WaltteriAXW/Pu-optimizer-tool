import { useState } from 'react'
import { CalculatorProvider, useCalculator } from './context/CalculatorContext'
import { CalculatorForm } from './components/CalculatorForm'
import { ResultsDisplay } from './components/ResultsDisplay'
import { HistorySidebar } from './components/HistorySidebar'
import { Activity, History } from 'lucide-react'

/** Where the repository lives. Both header and footer link here rather than to '#'. */
const REPO_URL = 'https://github.com/WaltteriAXW/Pu-optimizer-tool'

/**
 * The user guide. Points at the rendered guide in the repository — the two "Documentation"
 * links previously went nowhere at all: one was a <button> with no handler, the other an
 * anchor to '#'. Both looked clickable and did nothing.
 */
const DOCS_URL = `${REPO_URL}/blob/main/GETTING_STARTED.md`

function AppContent() {
  const {
    history,
    deleteHistory,
    loadFromHistory,
    recordOutcome,
    pressureUnit,
    setPressureUnit,
  } = useCalculator()
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    // No overflow-hidden here: it clipped anything wider than a phone screen — the export
    // row lost its PDF button — instead of letting it wrap where it could be seen.
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-surface border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Wraps rather than running off the screen when someone has enlarged their text */}
          <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 min-h-16 py-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  PU Optimizer
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 font-medium">
                  Physics-Based Injection Engine
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {/* Shown at every width: the unit is a setting, and a setting that exists on a
                  laptop but not on the phone at the machine is a missing feature there.

                  Display only: the engine and every saved run hold bar, and this converts
                  at the point of display. A good deal of injection equipment is specified
                  in psi, and converting by hand at the machine is how mistakes get made. */}
              <div
                role="group"
                aria-label="Pressure unit"
                className="segmented"
              >
                {(['bar', 'psi'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setPressureUnit(unit)}
                    aria-pressed={pressureUnit === unit}
                    data-testid={`unit-${unit}`}
                    className={`segment ${pressureUnit === unit ? 'segment-selected' : ''}`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Documentation
              </a>
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                aria-expanded={historyOpen}
                // The word "History" is hidden below the sm breakpoint, leaving an icon
                // and a bare count; the label carries the meaning at every width
                aria-label={`Calculation history, ${history.length} ${
                  history.length === 1 ? 'run' : 'runs'
                } saved`}
                className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                  historyOpen
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
                title={`Calculation History (${history.length})`}
              >
                <History aria-hidden="true" className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
                {history.length > 0 && (
                  <span
                    aria-hidden="true"
                    // A neutral count. Red badges are for things that need attention, and a
                    // number of saved runs never does.
                    className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-700"
                  >
                    {history.length}
                  </span>
                )}
              </button>
              {/* On a phone the header keeps only the settings; both links are in the footer */}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* One column until there is room for two. A 12-column grid at every width carried
            eleven rem-sized gaps, which at doubled text were wider than a phone. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Input Panel */}
          <div className="min-w-0 lg:col-span-4 xl:col-span-3">
            {/* On a wide screen the form keeps its place beside the results and scrolls on
                its own. Plain sticky positioning pinned the TOP of a form taller than the
                window, which kept the Run button below the fold for the first thousand
                pixels of scrolling. The scroll padding keeps a field brought into view
                (by Tab, say) clear of the button pinned over the bottom of the column. */}
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:scroll-pb-32 lg:rounded-xl">
              <CalculatorForm />
            </div>
          </div>

          {/* Right Column: Results Dashboard */}
          <div className="min-w-0 lg:col-span-8 xl:col-span-9">
            <ResultsDisplay />
          </div>
        </div>
      </main>

      {/* History Sidebar */}
      <HistorySidebar
        history={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectEntry={(entry) => {
          loadFromHistory(entry)
          setHistoryOpen(false)
        }}
        onDeleteEntry={deleteHistory}
        onRecordOutcome={recordOutcome}
      />

      {/* Sidebar backdrop. Shown at every width: the panel overlays the page on a wide
          screen too, and hiding the backdrop above lg left no way to dismiss it by
          clicking away — the only exit was finding the toggle again. */}
      {historyOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} PU Optimizer. Polyurethane injection molding
              physics engine.
            </div>
            <div className="flex items-center gap-4">
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Documentation
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <CalculatorProvider>
      <AppContent />
    </CalculatorProvider>
  )
}
