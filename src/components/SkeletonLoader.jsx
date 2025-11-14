/* eslint-disable react/prop-types */
import React from 'react';

/**
 * Basic skeleton loading component
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Variant type: 'text', 'title', 'button', 'card', 'chart'
 * @param {number} props.lines - Number of lines for text variant (default: 3)
 */
export const Skeleton = ({ className = '', variant = 'text', lines = 3 }) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} h-4`}
            style={{ width: i === lines - 1 ? '80%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'title') {
    return <div className={`${baseClasses} h-8 w-2/3 ${className}`} />;
  }

  if (variant === 'button') {
    return <div className={`${baseClasses} h-10 w-24 ${className}`} />;
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${className}`}>
        <div className="p-4 space-y-3">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`${baseClasses} h-64 flex items-end justify-around p-4 ${className}`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-300 dark:bg-gray-600 rounded-t"
            style={{
              height: `${Math.random() * 80 + 20}%`,
              width: '6%'
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={`${baseClasses} ${className}`} />;
};

/**
 * Skeleton loader for calculation results
 */
export const CalculationResultsSkeleton = () => (
  <div className="space-y-4 animate-fadeIn">
    <Skeleton variant="title" />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-1/2" />
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-3/4" />
        </div>
      ))}
    </div>

    <div className="mt-6">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-1/4 mb-4" />
      <Skeleton variant="chart" />
    </div>
  </div>
);

/**
 * Skeleton loader for database view
 */
export const DatabaseSkeleton = () => (
  <div className="space-y-4 animate-fadeIn">
    <div className="flex justify-between items-center">
      <Skeleton variant="title" />
      <Skeleton variant="button" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-32" />
      ))}
    </div>
  </div>
);

/**
 * Skeleton loader for input form
 */
export const FormSkeleton = () => (
  <div className="space-y-4 animate-fadeIn">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-1/4" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-10" />
      </div>
    ))}
    <Skeleton variant="button" className="w-full" />
  </div>
);

/**
 * Loading spinner component
 */
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`inline-block ${sizes[size]} ${className}`}>
      <div className="animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 h-full w-full" />
    </div>
  );
};

/**
 * Loading overlay component
 */
export const LoadingOverlay = ({ message = 'Loading...', show = true }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Progress bar component for loading states
 */
export const ProgressBar = ({ progress = 0, className = '', showPercentage = true }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Pyodide loading component with progress
 */
export const PyodideLoader = ({ progress = 0, stage = 'initializing' }) => {
  const stages = {
    initializing: 'Initializing Python runtime...',
    loading: 'Loading Pyodide...',
    numpy: 'Loading NumPy...',
    sklearn: 'Loading scikit-learn...',
    calculator: 'Loading calculator module...',
    ml: 'Loading ML optimizer...',
    training: 'Training ML models...',
    ready: 'Ready!'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <LoadingSpinner size="lg" />
      <div className="text-center space-y-2">
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {stages[stage] || 'Loading...'}
        </p>
        <ProgressBar progress={progress} className="w-64" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        First load may take a moment...
      </p>
    </div>
  );
};

export default Skeleton;
