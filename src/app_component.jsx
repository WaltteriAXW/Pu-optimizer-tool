import React, { useState, useEffect } from 'react';
import PythonCalculationErrorBoundary from './error_boundary';
import { PythonRuntimeErrorBoundary } from './specialized_error_boundaries';
import PolyurethaneOptimizer from './polyurethane_optimizer_component';
import { LoadingScreen } from './components/LoadingScreen';
import { ThemeToggle } from './components/ThemeToggle';

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
      <div className="relative bg-slate-950 min-h-screen overflow-hidden">
        {/* Industrial header with Mission Control aesthetic */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-4 justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2 animate-slideInLeft">
            <div className="w-3 h-3 bg-cyan-500 rounded-full shadow-glow-cyan animate-pulse"></div>
            <h1 className="font-bold tracking-widest text-sm text-slate-50 font-sans">
              PU-OPTIMIZER <span className="text-slate-500">v2.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 animate-slideInRight">
            <ThemeToggle />
            <a
              href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-cyan-400 transition-colors text-xs font-mono"
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
              <span className="hidden sm:inline">GITHUB</span>
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

        <footer className="relative mt-10 py-6 px-4 border-t border-slate-800 bg-slate-900/30">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="max-w-7xl mx-auto text-center relative">
            <p className="text-xs font-mono text-slate-500 mb-2">
              PU-OPTIMIZER v2.0 - Professional Engineering Solution
            </p>
            <p className="text-[10px] text-slate-600 font-mono">
              © {new Date().getFullYear()} - Industrial Design System • Power Law & Arrhenius Models
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AppComponent;
