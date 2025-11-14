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
    <div className="relative bg-neutral-dark dark:bg-neutral-dark min-h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F1419 0%, #1A1F2E 100%)' }}>
      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="accent-orb accent-orb-cyan" style={{ top: '20%', right: '20%', width: '200px', height: '200px' }}></div>
        <div className="accent-orb accent-orb-orange" style={{ bottom: '10%', left: '15%', width: '150px', height: '150px', animationDelay: '5s' }}></div>
        <div className="accent-orb accent-orb-cyan" style={{ top: '60%', left: '5%', width: '180px', height: '180px', animationDelay: '10s' }}></div>
      </div>

      <header className="relative bg-neutral-medium/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b" style={{ backgroundColor: 'rgba(26, 31, 46, 0.8)', borderColor: 'rgba(0, 217, 255, 0.1)' }}>
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center animate-slideInLeft">
            <div className="relative">
              <svg
                className="h-8 w-8 sm:h-10 sm:w-10 mr-3 hover-scale transition-transform"
                style={{ color: '#00D9FF' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <div className="absolute inset-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full blur-xl opacity-30 animate-pulse" style={{ backgroundColor: '#00D9FF' }}></div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#E0E2E9' }}>
                Polyurethane Injection Optimizer
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#A8ABB3' }}>
                Professional Tool for Italian Injection Molding Machines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 animate-slideInRight">
            <ThemeToggle />
            <a
              href="https://github.com/WaltteriAXW/Pu-optimizer-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative transition-all duration-300 hover-lift inline-flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ color: '#A8ABB3' }}
              aria-label="View on GitHub"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#00D9FF';
                e.currentTarget.style.backgroundColor = 'rgba(0, 217, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#A8ABB3';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
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

      <footer className="relative mt-10 py-8 px-4 shadow-inner border-t" style={{ background: 'linear-gradient(135deg, #1A1F2E 0%, #0F1419 100%)', borderColor: 'rgba(0, 217, 255, 0.1)' }}>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="animate-fadeIn">
            <p className="text-sm font-bold mb-3" style={{ color: '#E0E2E9' }}>
              Polyurethane Injection Optimizer Tool - Enhanced Version
            </p>
            <p className="text-xs mb-4" style={{ color: '#7A7D87' }}>
              © {new Date().getFullYear()} - Professional Engineering Solution
            </p>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-4 items-center animate-slideUp">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm hover-lift transition-all" style={{ backgroundColor: 'rgba(26, 31, 46, 0.5)', border: '1px solid rgba(0, 208, 132, 0.1)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00D084' }}></div>
              <span className="text-xs font-medium" style={{ color: '#A8ABB3' }}>
                <span className="font-semibold" style={{ color: '#00D084' }}>Ecofoam</span> •
                <span className="font-semibold" style={{ color: '#00D084' }}> Ecomate</span> Materials
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-6 text-xs animate-fadeIn stagger-3" style={{ color: '#A8ABB3' }}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#00D9FF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Power Law Fluid Dynamics</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#FF6B35' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Arrhenius Equations</span>
            </div>
          </div>

          <div className="mt-4 text-xs italic animate-fadeIn stagger-4" style={{ color: '#7A7D87' }}>
            Made with precision for injection molding professionals worldwide
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default AppComponent;
