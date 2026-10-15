import { useState } from 'react'
import { CalculatorProvider, useCalculator } from './context/CalculatorContext'
import { CalculatorForm } from './components/CalculatorForm'
import { ResultsDisplay } from './components/ResultsDisplay'
import { HistorySidebar } from './components/HistorySidebar'
import { SettingsSheet } from './components/SettingsSheet'
import { BrandMark, BRAND_NAME, BRAND_TAGLINE } from './components/BrandMark'
import { History, Settings } from 'lucide-react'

function AppContent() {
  const {
    history,
    deleteHistory,
    loadFromHistory,
    recordOutcome,
  } = useCalculator()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    // No overflow-hidden here: it clipped anything wider than a phone screen — the export
    // row lost its PDF button — instead of letting it wrap where it could be seen.
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Toolbar. A translucent material over the content, as a system toolbar is: the
          page scrolls beneath it rather than meeting a solid edge. The name leads; the two
          controls — History and Settings — sit on the trailing edge. Unit and appearance
          live in Settings rather than taking space here. */}
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-surface/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Wraps rather than running off the screen when someone has enlarged their text */}
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={40} className="flex-shrink-0 drop-shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight tracking-tight text-slate-900">
                  {BRAND_NAME}
                </h1>
                <p className="hidden text-sm leading-snug text-slate-500 sm:block">
                  {BRAND_TAGLINE}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                aria-expanded={historyOpen}
                // The word "History" is hidden below the sm breakpoint, leaving an icon and
                // a bare count; the label carries the meaning at every width
                aria-label={`Calculation history, ${history.length} ${
                  history.length === 1 ? 'run' : 'runs'
                } saved`}
                title="Calculation history"
                className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                  historyOpen
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <History aria-hidden="true" className="h-5 w-5" />
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
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-haspopup="dialog"
                aria-label="Settings"
                title="Settings"
                data-testid="open-settings"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <Settings aria-hidden="true" className="h-5 w-5" />
              </button>
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
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:scroll-pb-32 lg:rounded-2xl">
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

      {/* Footer: the name and what it is. The guide and source links live in Settings. */}
      <footer className="mt-16 border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
          <p className="text-sm text-slate-500">
            Runs entirely in your browser. Nothing you enter is uploaded.
          </p>
        </div>
      </footer>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
