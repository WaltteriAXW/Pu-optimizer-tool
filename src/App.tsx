import React from 'react'
import { CalculatorProvider } from './context/CalculatorContext'
import { CalculatorForm } from './components/CalculatorForm'
import { ResultsDisplay } from './components/ResultsDisplay'
import { Activity, BookOpen } from 'lucide-react'

function AppContent() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
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
              <button className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Documentation
              </button>
              <a
                href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
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

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-500">
              © 2024 PU Optimizer. Polyurethane injection molding physics engine.
            </div>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
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
