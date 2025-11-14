/* eslint-disable react/prop-types */
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { AlertTriangle, RefreshCw, Database, Calculator } from 'lucide-react';

/**
 * Base error boundary component with customizable fallback
 */
class BaseErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', this.props.boundaryName, error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Error details</summary>
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleReset}
                className="mt-2 flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary for calculation engine
 */
export class CalculationErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        boundaryName="CalculationEngine"
        fallback={(error, reset) => (
          <Alert variant="destructive" className="m-4">
            <Calculator className="h-4 w-4" />
            <AlertTitle>Calculation Error</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>Failed to perform calculations: {error?.message}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This could be due to invalid input parameters or a calculation overflow.
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Check that all input values are within valid ranges</li>
                  <li>Ensure pipe diameter and length are reasonable</li>
                  <li>Try refreshing the page if the problem persists</li>
                </ul>
                <button
                  onClick={reset}
                  className="mt-2 flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Calculator
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {...this.props}
      />
    );
  }
}

/**
 * Error boundary for database operations
 */
export class DatabaseErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        boundaryName="Database"
        fallback={(error, reset) => (
          <Alert variant="destructive" className="m-4">
            <Database className="h-4 w-4" />
            <AlertTitle>Database Error</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>Failed to load database: {error?.message}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The material database could not be loaded properly.
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Check your internet connection</li>
                  <li>The database file may be corrupted</li>
                  <li>Try clearing your browser cache</li>
                </ul>
                <button
                  onClick={reset}
                  className="mt-2 flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Database Load
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {...this.props}
      />
    );
  }
}

/**
 * Error boundary for Python/Pyodide runtime
 */
export class PythonRuntimeErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        boundaryName="PythonRuntime"
        fallback={(error, reset) => (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Python Runtime Error</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>Python calculation engine failed: {error?.message}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The browser-based Python runtime (Pyodide) encountered an error.
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Fallback JavaScript calculations may be used instead</li>
                  <li>Some advanced features might be unavailable</li>
                  <li>Refreshing the page may help reload Pyodide</li>
                </ul>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {...this.props}
      />
    );
  }
}

/**
 * Error boundary for chart/visualization components
 */
export class ChartErrorBoundary extends React.Component {
  render() {
    return (
      <BaseErrorBoundary
        boundaryName="Chart"
        fallback={(error, reset) => (
          <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-red-800 dark:text-red-200 text-sm">
              ⚠️ Unable to display chart: {error?.message}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Data may still be available in table format
            </p>
          </div>
        )}
        {...this.props}
      />
    );
  }
}

export default BaseErrorBoundary;
