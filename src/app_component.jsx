import React from 'react';
import PythonCalculationErrorBoundary from './error_boundary';
import { PythonRuntimeErrorBoundary } from './specialized_error_boundaries';
import PolyurethaneOptimizer from './polyurethane_optimizer_component';
import { ThemeToggle } from './components/ThemeToggle';

const AppComponent = () => {
  return (
    <div className="relative bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-gray-900">
            PU-Optimizer <span className="text-gray-400 text-sm">v2.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-blue-600 transition-colors text-sm"
            aria-label="View on GitHub"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      <main>
        <PythonCalculationErrorBoundary>
          <PythonRuntimeErrorBoundary>
            <PolyurethaneOptimizer />
          </PythonRuntimeErrorBoundary>
        </PythonCalculationErrorBoundary>
      </main>

      <footer className="py-6 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            PU-Optimizer v2.0 — Polyurethane Injection Molding Calculator
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppComponent;
