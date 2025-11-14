/* eslint-disable no-console */
/**
 * Performance Monitoring Utility
 *
 * @module utils/performance
 * @description Tools for measuring and monitoring application performance.
 * Helps identify bottlenecks and optimize user experience.
 *
 * @example
 * import { measurePerformance, measureAsync } from './utils/performance';
 *
 * const result = measurePerformance('MyCalculation', () => {
 *   // expensive operation
 *   return calculate();
 * });
 */

import { logDebug, logWarning } from './errorTracking';

/**
 * Performance thresholds in milliseconds
 */
const THRESHOLDS = {
  FAST: 16, // One frame at 60fps
  ACCEPTABLE: 100, // Barely noticeable
  SLOW: 1000, // Noticeable lag
  VERY_SLOW: 3000 // Unacceptable
};

/**
 * Check if we're in development mode
 */
const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Format duration with appropriate units
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 *
 * @example
 * formatDuration(1500) // "1.50s"
 * formatDuration(50)   // "50ms"
 */
export function formatDuration(ms) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}

/**
 * Get performance classification based on duration
 *
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Performance classification
 */
function getPerformanceClass(duration) {
  if (duration < THRESHOLDS.FAST) return 'fast';
  if (duration < THRESHOLDS.ACCEPTABLE) return 'acceptable';
  if (duration < THRESHOLDS.SLOW) return 'slow';
  if (duration < THRESHOLDS.VERY_SLOW) return 'very-slow';
  return 'critical';
}

/**
 * Get emoji indicator for performance
 *
 * @param {string} perfClass - Performance classification
 * @returns {string} Emoji indicator
 */
function getPerformanceEmoji(perfClass) {
  const emojis = {
    'fast': '⚡',
    'acceptable': '✅',
    'slow': '⚠️',
    'very-slow': '🐌',
    'critical': '🔴'
  };
  return emojis[perfClass] || '❓';
}

/**
 * Measure the execution time of a synchronous function
 *
 * @param {string} name - Name/label for the measurement
 * @param {Function} fn - Function to measure
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.silent=false] - Don't log to console
 * @param {boolean} [options.warnIfSlow=true] - Warn if execution is slow
 * @returns {*} Result of the function
 *
 * @example
 * const result = measurePerformance('Calculate Pressure', () => {
 *   return calculatePressureDrop(params);
 * });
 */
export function measurePerformance(name, fn, options = {}) {
  const { silent = false, warnIfSlow = true } = options;

  const startTime = performance.now();
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  // Use Performance API marks if available
  if (performance.mark) {
    performance.mark(startMark);
  }

  let result;
  let error;

  try {
    result = fn();
  } catch (err) {
    error = err;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  if (performance.mark && performance.measure) {
    performance.mark(endMark);
    try {
      performance.measure(name, startMark, endMark);
    } catch (e) {
      // Ignore measurement errors
    }
  }

  const perfClass = getPerformanceClass(duration);
  const emoji = getPerformanceEmoji(perfClass);

  if (!silent && isDevelopment()) {
    const message = `${emoji} ${name}: ${formatDuration(duration)}`;

    if (perfClass === 'slow' || perfClass === 'very-slow' || perfClass === 'critical') {
      if (warnIfSlow) {
        logWarning(message, { duration, perfClass, name });
      } else {
        console.log(message);
      }
    } else {
      logDebug(message, { duration, perfClass });
    }
  }

  if (error) {
    throw error;
  }

  return result;
}

/**
 * Measure the execution time of an async function
 *
 * @param {string} name - Name/label for the measurement
 * @param {Function} asyncFn - Async function to measure
 * @param {Object} [options={}] - Options
 * @returns {Promise<*>} Result of the async function
 *
 * @example
 * const data = await measureAsync('Load Database', async () => {
 *   return await loadDatabase();
 * });
 */
export async function measureAsync(name, asyncFn, options = {}) {
  const { silent = false, warnIfSlow = true } = options;

  const startTime = performance.now();
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  if (performance.mark) {
    performance.mark(startMark);
  }

  let result;
  let error;

  try {
    result = await asyncFn();
  } catch (err) {
    error = err;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  if (performance.mark && performance.measure) {
    performance.mark(endMark);
    try {
      performance.measure(name, startMark, endMark);
    } catch (e) {
      // Ignore measurement errors
    }
  }

  const perfClass = getPerformanceClass(duration);
  const emoji = getPerformanceEmoji(perfClass);

  if (!silent && isDevelopment()) {
    const message = `${emoji} ${name}: ${formatDuration(duration)}`;

    if (perfClass === 'slow' || perfClass === 'very-slow' || perfClass === 'critical') {
      if (warnIfSlow) {
        logWarning(message, { duration, perfClass, name });
      } else {
        console.log(message);
      }
    } else {
      logDebug(message, { duration, perfClass });
    }
  }

  if (error) {
    throw error;
  }

  return result;
}

/**
 * Create a performance marker to measure time between events
 *
 * @param {string} name - Name of the measurement
 * @returns {Function} End function to call when measurement is complete
 *
 * @example
 * const endMeasure = startMeasure('User Flow');
 * // ... do some work ...
 * endMeasure();
 */
export function startMeasure(name) {
  const startTime = performance.now();
  const startMark = `${name}-start`;

  if (performance.mark) {
    performance.mark(startMark);
  }

  return (context = {}) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const endMark = `${name}-end`;

    if (performance.mark && performance.measure) {
      performance.mark(endMark);
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        // Ignore
      }
    }

    const perfClass = getPerformanceClass(duration);
    const emoji = getPerformanceEmoji(perfClass);

    if (isDevelopment()) {
      logDebug(`${emoji} ${name}: ${formatDuration(duration)}`, {
        duration,
        perfClass,
        ...context
      });
    }

    return { duration, perfClass };
  };
}

/**
 * Get all performance measurements
 *
 * @returns {PerformanceEntry[]} Array of performance entries
 *
 * @example
 * const measurements = getPerformanceMeasurements();
 * measurements.forEach(m => console.log(m.name, m.duration));
 */
export function getPerformanceMeasurements() {
  if (performance.getEntriesByType) {
    return performance.getEntriesByType('measure');
  }
  return [];
}

/**
 * Clear all performance measurements
 *
 * @example
 * clearPerformanceMeasurements();
 */
export function clearPerformanceMeasurements() {
  if (performance.clearMeasures) {
    performance.clearMeasures();
  }
  if (performance.clearMarks) {
    performance.clearMarks();
  }
}

/**
 * Get performance summary statistics
 *
 * @returns {Object} Summary of performance measurements
 *
 * @example
 * const summary = getPerformanceSummary();
 * console.log(`Average: ${summary.average}ms`);
 */
export function getPerformanceSummary() {
  const measurements = getPerformanceMeasurements();

  if (measurements.length === 0) {
    return {
      count: 0,
      total: 0,
      average: 0,
      min: 0,
      max: 0
    };
  }

  const durations = measurements.map(m => m.duration);
  const total = durations.reduce((sum, d) => sum + d, 0);
  const average = total / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  return {
    count: measurements.length,
    total: total.toFixed(2),
    average: average.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2)
  };
}

export default {
  measurePerformance,
  measureAsync,
  startMeasure,
  getPerformanceMeasurements,
  clearPerformanceMeasurements,
  getPerformanceSummary,
  formatDuration,
  THRESHOLDS
};
