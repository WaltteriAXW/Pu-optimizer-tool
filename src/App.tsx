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
  const { history, deleteHistory, loadFromHistory, recordOutcome } = useCalculator()
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  PU Optimizer
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Physics-Based Injection Engine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Documentation
              </a>
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  historyOpen
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
                title={`Calculation History (${history.length})`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
                {history.length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column: Input Panel */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24">
              <CalculatorForm />
            </div>
          </div>

          {/* Right Column: Results Dashboard */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9">
            <ResultsDisplay />
          </div>
        </div>
      </main>

      {/* History Sidebar */}
      <HistorySidebar
        history={history}
        isOpen={historyOpen}
        onSelectEntry={(entry) => {
          loadFromHistory(entry)
          setHistoryOpen(false)
        }}
        onDeleteEntry={deleteHistory}
        onRecordOutcome={recordOutcome}
      />

      {/* Sidebar Backdrop */}
      {historyOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
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
                className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Documentation
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
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
