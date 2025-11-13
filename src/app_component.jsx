import React, { useState, useEffect } from 'react';
import PythonCalculationErrorBoundary from './error_boundary';
import { PythonRuntimeErrorBoundary } from './specialized_error_boundaries';
import PolyurethaneOptimizer from './polyurethane_optimizer_component';
import { LoadingScreen } from './components/LoadingScreen';

const AppComponent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('initializing');

  useEffect(() => {
    // Simulate app initialization with stages
    const stages = [
      { name: 'initializing', duration: 300, progress: 20 },
      { name: 'loading', duration: 400, progress: 40 },
      { name: 'database', duration: 500, progress: 70 },
      { name: 'calculations', duration: 400, progress: 90 },
      { name: 'ready', duration: 200, progress: 100 }
    ];

    let totalDelay = 0;

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setLoadingStage(stage.name);
        setLoadingProgress(stage.progress);

        if (index === stages.length - 1) {
          setTimeout(() => setIsLoading(false), stage.duration);
        }
      }, totalDelay);

      totalDelay += stage.duration;
    });
  }, []);

  return (
    <>
      <LoadingScreen
        isLoading={isLoading}
        progress={loadingProgress}
        stage={loadingStage}
      />
    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 dark:bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/5 to-purple-400/5 dark:from-blue-600/5 dark:to-purple-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <header className="relative bg-white/80 dark:bg-gray-800/80 shadow-lg sticky top-0 z-50 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center animate-slideInLeft">
            <div className="relative">
              <svg
                className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 dark:text-blue-400 mr-3 hover-scale transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <div className="absolute inset-0 h-8 w-8 sm:h-10 sm:w-10 bg-blue-400 dark:bg-blue-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold gradient-text-animate">
                Polyurethane Injection Optimizer
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Professional Tool for Italian Injection Molding Machines
              </p>
            </div>
          </div>
          <div className="animate-slideInRight">
            <a
              href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-all duration-300 hover-lift inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              aria-label="View on GitHub"
            >
              <svg
                className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:rotate-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              <span className="hidden sm:inline text-sm font-medium">GitHub</span>
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

      <footer className="relative bg-gradient-to-r from-gray-100 via-blue-100 to-purple-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 mt-10 py-8 px-4 shadow-inner border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="animate-fadeIn">
            <p className="text-sm font-bold gradient-text mb-3">
              Polyurethane Injection Optimizer Tool - Enhanced Version
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              © {new Date().getFullYear()} - Professional Engineering Solution
            </p>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-4 items-center animate-slideUp">
            <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-4 py-2 rounded-lg backdrop-blur-sm hover-lift">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-blue-600 dark:text-blue-400">Cannon</span> •
                <span className="font-semibold text-blue-600 dark:text-blue-400"> AMA Gusberti</span> •
                <span className="font-semibold text-blue-600 dark:text-blue-400"> SAIP</span> •
                <span className="font-semibold text-blue-600 dark:text-blue-400"> ISC Italy</span>
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-4 py-2 rounded-lg backdrop-blur-sm hover-lift">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-green-600 dark:text-green-400">Ecofoam</span> •
                <span className="font-semibold text-green-600 dark:text-green-400"> Ecomate</span> Materials
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-6 text-xs text-gray-600 dark:text-gray-400 animate-fadeIn stagger-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Power Law Fluid Dynamics</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Arrhenius Equations</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-500 italic animate-fadeIn stagger-4">
            Made with precision for injection molding professionals worldwide
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default AppComponent;
