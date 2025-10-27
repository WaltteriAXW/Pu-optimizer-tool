/**
 * Error Tracking Utility
 *
 * @module utils/errorTracking
 * @description Centralized error logging and tracking for production environments.
 * Can be integrated with services like Sentry, LogRocket, or Rollbar.
 *
 * @example
 * import { logError, logWarning } from './utils/errorTracking';
 *
 * try {
 *   // risky operation
 * } catch (error) {
 *   logError(error, { context: 'calculation', userId: '123' });
 * }
 */

/**
 * Log levels for categorizing messages
 */
export const LogLevel = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Check if we're in development mode
 */
const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Check if we're in production mode
 */
const isProduction = () => {
  return import.meta.env.PROD || import.meta.env.MODE === 'production';
};

/**
 * Log an error with context information
 *
 * In development: logs to console with full details
 * In production: would send to error tracking service (Sentry, etc.)
 *
 * @param {Error|string} error - Error object or message
 * @param {Object} [context={}] - Additional context information
 * @param {string} [context.component] - Component where error occurred
 * @param {string} [context.action] - Action that caused the error
 * @param {Object} [context.metadata] - Any additional metadata
 *
 * @example
 * logError(new Error('Calculation failed'), {
 *   component: 'Calculator',
 *   action: 'performCalculation',
 *   metadata: { inputs: {...} }
 * });
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    ...context
  };

  if (isDevelopment()) {
    console.group('❌ Error Logged');
    console.error('Message:', errorInfo.message);
    if (errorInfo.stack) {
      console.error('Stack:', errorInfo.stack);
    }
    if (Object.keys(context).length > 0) {
      console.error('Context:', context);
    }
    console.groupEnd();
  }

  if (isProduction()) {
    // In production, send to error tracking service
    // Example integrations (uncomment and configure as needed):

    // Sentry integration:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     extra: context,
    //     level: 'error'
    //   });
    // }

    // LogRocket integration:
    // if (window.LogRocket) {
    //   window.LogRocket.captureException(error, {
    //     extra: context
    //   });
    // }

    // For now, just log to console in production too (can be disabled later)
    console.error('[Error]', errorInfo.message, context);
  }

  return errorInfo;
}

/**
 * Log a warning message
 *
 * @param {string} message - Warning message
 * @param {Object} [context={}] - Additional context
 *
 * @example
 * logWarning('High pressure detected', {
 *   component: 'Calculator',
 *   pressure: 8.5
 * });
 */
export function logWarning(message, context = {}) {
  const warningInfo = {
    message,
    timestamp: new Date().toISOString(),
    level: LogLevel.WARNING,
    ...context
  };

  if (isDevelopment()) {
    console.warn('⚠️ Warning:', message, context);
  }

  if (isProduction()) {
    // Send warnings to tracking service if needed
    // Most services support warning level
    console.warn('[Warning]', message, context);
  }

  return warningInfo;
}

/**
 * Log an informational message
 *
 * @param {string} message - Info message
 * @param {Object} [context={}] - Additional context
 *
 * @example
 * logInfo('Calculation completed successfully', {
 *   duration: 125
 * });
 */
export function logInfo(message, context = {}) {
  if (isDevelopment()) {
    console.info('ℹ️ Info:', message, context);
  }

  return {
    message,
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    ...context
  };
}

/**
 * Log a debug message (only in development)
 *
 * @param {string} message - Debug message
 * @param {Object} [context={}] - Additional context
 *
 * @example
 * logDebug('Entering calculation loop', { iteration: 5 });
 */
export function logDebug(message, context = {}) {
  if (isDevelopment()) {
    console.debug('🐛 Debug:', message, context);
  }

  return {
    message,
    timestamp: new Date().toISOString(),
    level: LogLevel.DEBUG,
    ...context
  };
}

/**
 * Create a tagged logger for a specific component
 *
 * @param {string} componentName - Name of the component
 * @returns {Object} Logger object with tagged methods
 *
 * @example
 * const logger = createLogger('Calculator');
 * logger.error(new Error('Failed'), { action: 'calculate' });
 * // Automatically includes component: 'Calculator'
 */
export function createLogger(componentName) {
  return {
    error: (error, context = {}) =>
      logError(error, { component: componentName, ...context }),
    warning: (message, context = {}) =>
      logWarning(message, { component: componentName, ...context }),
    info: (message, context = {}) =>
      logInfo(message, { component: componentName, ...context }),
    debug: (message, context = {}) =>
      logDebug(message, { component: componentName, ...context })
  };
}

/**
 * Initialize error tracking service
 * Call this once in your main.jsx
 *
 * @param {Object} config - Configuration object
 * @param {string} config.dsn - Data Source Name for error tracking service
 * @param {string} config.environment - Environment name (development, staging, production)
 * @param {string} config.release - Application version/release identifier
 *
 * @example
 * initErrorTracking({
 *   dsn: 'https://your-sentry-dsn@sentry.io/project',
 *   environment: 'production',
 *   release: '1.0.0'
 * });
 */
export function initErrorTracking(config = {}) {
  if (isProduction() && config.dsn) {
    // Example: Initialize Sentry
    // if (window.Sentry) {
    //   window.Sentry.init({
    //     dsn: config.dsn,
    //     environment: config.environment || 'production',
    //     release: config.release || 'unknown',
    //     integrations: [
    //       new window.Sentry.BrowserTracing(),
    //     ],
    //     tracesSampleRate: 0.1,
    //   });
    // }

    logInfo('Error tracking initialized', config);
  } else if (isDevelopment()) {
    logInfo('Error tracking disabled in development mode');
  }
}

export default {
  logError,
  logWarning,
  logInfo,
  logDebug,
  createLogger,
  initErrorTracking,
  LogLevel
};
