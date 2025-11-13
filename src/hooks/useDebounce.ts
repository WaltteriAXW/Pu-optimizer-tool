/**
 * Debounce Hooks Module
 *
 * @module hooks/useDebounce
 * @description Custom React hooks for debouncing values and callbacks.
 * Debouncing delays execution until after a specified time has elapsed since the last invocation,
 * preventing excessive function calls during rapid user input or frequent state updates.
 *
 * @example
 * import { useDebounce, useDebouncedCallback } from './hooks/useDebounce';
 *
 * // Debounce a value
 * const debouncedValue = useDebounce(searchTerm, 500);
 *
 * // Debounce a callback
 * const debouncedSave = useDebouncedCallback(saveData, 1000);
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 *
 * Delays updating the returned value until the specified delay has elapsed
 * since the last change to the input value. Useful for reducing expensive
 * operations like API calls, calculations, or renders triggered by rapid
 * user input.
 *
 * @template T
 * @param {T} value - The value to debounce (can be any type)
 * @param {number} [delay=500] - Delay in milliseconds before updating
 * @returns {T} The debounced value (same type as input)
 *
 * @example
 * // Debounce search input
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // This only runs 500ms after the user stops typing
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 *
 * @example
 * // Debounce calculator inputs to reduce re-renders
 * const debouncedInputs = useDebounce(inputs, 300);
 * const results = calculateResults(debouncedInputs);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update debounced value
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debouncing callback functions
 *
 * Returns a debounced version of the provided callback that delays execution
 * until after the specified delay has elapsed since the last invocation.
 * Automatically cleans up pending timeouts when the component unmounts.
 *
 * @template T
 * @param {(...args: T[]) => void} callback - The function to debounce
 * @param {number} [delay=500] - Delay in milliseconds before executing
 * @returns {(...args: T[]) => void} The debounced function with same signature as callback
 *
 * @example
 * // Debounce form submission
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToServer(data);
 * }, 1000);
 *
 * // Call it multiple times, but it only executes once after 1s of inactivity
 * debouncedSave(formData);
 *
 * @example
 * // Debounce API calls during typing
 * const debouncedFetch = useDebouncedCallback(
 *   async (query) => {
 *     const results = await fetchSuggestions(query);
 *     setSuggestions(results);
 *   },
 *   300
 * );
 *
 * <input onChange={(e) => debouncedFetch(e.target.value)} />
 */
export function useDebouncedCallback<T extends any[]>(
  callback: (...args: T) => void,
  delay: number = 500
): (...args: T) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = (...args: T) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
}
