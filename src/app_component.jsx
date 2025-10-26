import React from 'react';
import PythonCalculationErrorBoundary from './error_boundary';
import { PythonRuntimeErrorBoundary } from './specialized_error_boundaries';
import PolyurethaneOptimizer from './polyurethane_optimizer_component';

const AppComponent = () => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center">
            <svg
              className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mr-3 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Polyurethane Injection Optimizer
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Professional Tool for Italian Injection Molding Machines
              </p>
            </div>
          </div>
          <div>
            <a
              href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors transform hover:scale-110 inline-block"
              aria-label="View on GitHub"
            >
              <svg
                className="h-6 w-6 sm:h-7 sm:w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main>
        <PythonCalculationErrorBoundary>
          <PythonRuntimeErrorBoundary>
            <PolyurethaneOptimizer />
          </PythonRuntimeErrorBoundary>
        </PythonCalculationErrorBoundary>
      </main>

      <footer className="bg-gradient-to-r from-gray-100 to-blue-100 dark:from-gray-800 dark:to-gray-900 mt-10 py-8 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Polyurethane Injection Optimizer Tool - Enhanced Version - {new Date().getFullYear()}
          </p>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            Supporting <span className="font-medium text-blue-600 dark:text-blue-400">Cannon, AMA Gusberti, SAIP & ISC Italy</span> machines | <span className="font-medium text-green-600 dark:text-green-400">Ecofoam & Ecomate</span> materials
          </p>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Advanced fluid dynamics models with Power Law and Arrhenius equations
          </p>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            Made with precision for injection molding professionals
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppComponent;
