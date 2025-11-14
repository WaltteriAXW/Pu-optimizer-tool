/* eslint-disable react/prop-types */
/**
 * Theme Provider Component
 *
 * Initializes and manages application theme globally.
 * Should be placed at the root of the application.
 *
 * Handles:
 * - Initial theme detection (user preference or system default)
 * - DOM class application for dark mode
 * - Theme persistence across sessions
 * - System theme change detection
 *
 * @component
 * @example
 * import { ThemeProvider } from './components/ThemeProvider';
 *
 * export default function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourAppContent />
 *     </ThemeProvider>
 *   );
 * }
 */

import React, { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * Theme Provider Component
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider wrapper
 */
export function ThemeProvider({ children }) {
  const { isDark } = useTheme();

  // Apply theme to document root on mount and when theme changes
  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  return <>{children}</>;
}

export default ThemeProvider;
