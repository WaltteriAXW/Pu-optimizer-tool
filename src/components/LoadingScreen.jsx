/* eslint-disable react/prop-types */
/**
 * Loading Screen Component
 *
 * Beautiful splash screen shown during app initialization
 */

import React, { useState, useEffect } from 'react';

export const LoadingScreen = ({ isLoading = true, progress = 0, stage = 'initializing' }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const stages = {
    initializing: 'Initializing Application',
    loading: 'Loading Components',
    database: 'Loading Databases',
    calculations: 'Preparing Calculators',
    ready: 'Almost Ready'
  };

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-float opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 px-4 max-w-md w-full animate-fadeIn">
        {/* Logo/Icon */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl animate-spin-slow blur-xl opacity-75"></div>
          <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover-lift">
            <svg
              className="w-16 h-16 text-white mx-auto animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white animate-slideInDown">
            Polyurethane Optimizer
          </h1>
          <p className="text-blue-200 text-sm md:text-base animate-slideInUp">
            Professional Injection Molding Tool
          </p>
        </div>

        {/* Loading status */}
        <div className="space-y-4 animate-fadeIn stagger-2">
          <p className="text-white/90 font-medium text-lg">
            {stages[stage] || 'Loading'}{dots}
          </p>

          {/* Progress bar */}
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>

          {/* Percentage */}
          <p className="text-blue-200 text-sm font-mono">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Loading spinner */}
        <div className="flex justify-center items-center space-x-2 animate-fadeIn stagger-3">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Footer text */}
        <p className="text-white/50 text-xs mt-8 animate-fadeIn stagger-4">
          Powered by advanced fluid dynamics calculations
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
