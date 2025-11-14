/**
 * Custom hook for managing application theme with localStorage persistence
 *
 * Supports light and dark modes with automatic detection of system preference.
 * Persists user choice to localStorage so preference is maintained across sessions.
 *
 * @module hooks/useTheme
 * @example
 * const { theme, toggleTheme, isDark } = useTheme();
 *
 * useEffect(() => {
 *   if (isDark) {
 *     document.documentElement.classList.add('dark');
 *   } else {
 *     document.documentElement.classList.remove('dark');
 *   }
 * }, [isDark]);
 *
 * return (
 *   <button onClick={toggleTheme}>
 *     Current theme: {theme}
 *   </button>
 * );
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Theme hook return type
 */
export interface UseThemeReturn {
  /** Current theme mode ('light', 'dark', or 'auto') */
  theme: ThemeMode;
  /** Set theme mode */
  setTheme: (theme: ThemeMode) => void;
  /** Toggle between light and dark modes */
  toggleTheme: () => void;
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** System preference for dark mode (from media query) */
  systemPrefersDark: boolean;
}

const STORAGE_KEY = 'pu-optimizer-theme';
const DARK_CLASS = 'dark';

/**
 * Check if system prefers dark color scheme
 */
function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get current theme from localStorage or system preference
 */
function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored;
  }

  return 'auto';
}

/**
 * Determine if dark mode should be active
 */
function shouldBeDark(theme: ThemeMode, systemDark: boolean): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return systemDark; // auto mode
}

/**
 * Custom hook for managing application theme
 *
 * @returns {UseThemeReturn} Theme state and control functions
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme());
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    getSystemPrefersDark()
  );
  const [mounted, setMounted] = useState(false);

  // Listen for system theme changes
  useEffect(() => {
    setMounted(true);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemPrefersDark(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Update DOM when theme changes
  useEffect(() => {
    if (!mounted) return;

    const isDark = shouldBeDark(theme, systemPrefersDark);
    const root = document.documentElement;

    if (isDark) {
      root.classList.add(DARK_CLASS);
    } else {
      root.classList.remove(DARK_CLASS);
    }

    // Also set data attribute for CSS selectors
    root.setAttribute('data-theme', theme);
  }, [theme, systemPrefersDark, mounted]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // Toggle between light and dark (preserves auto mode)
  const toggleTheme = useCallback(() => {
    setTheme(shouldBeDark(theme, systemPrefersDark) ? 'light' : 'dark');
  }, [theme, systemPrefersDark, setTheme]);

  const isDark = shouldBeDark(theme, systemPrefersDark);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    systemPrefersDark
  };
}

export default useTheme;
