import React from 'react';
import PythonCalculationErrorBoundary from './error_boundary';
import PolyurethaneOptimizer from './polyurethane_optimizer_component';

const AppComponent = () => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center">
            <svg 
              className="h-8 w-8 text-blue-600 mr-3" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Polyurethane Injection Optimizer
            </h1>
          </div>
          <div>
            <a 
              href="https://github.com/WaltteriAXW/Pu-optimizer-tool" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg 
                className="h-6 w-6" 
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
          <PolyurethaneOptimizer />
        </PythonCalculationErrorBoundary>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 mt-10 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Polyurethane Injection Optimizer Tool - {new Date().getFullYear()}</p>
          <p className="mt-2">
            Using fluid dynamics models adapted for non-Newtonian fluids, including Arrhenius and Power Law equations
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppComponent;
