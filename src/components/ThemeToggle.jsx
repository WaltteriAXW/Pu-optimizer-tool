/**
 * Theme Toggle Button Component
 *
 * A button component for toggling between light and dark themes
 * with smooth icon transitions and accessibility support.
 *
 * @component
 * @example
 * import { ThemeToggle } from './components/ThemeToggle';
 *
 * export function Header() {
 *   return (
 *     <header>
 *       <h1>My App</h1>
 *       <ThemeToggle />
 *     </header>
 *   );
 * }
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Theme Toggle Button Component
 *
 * Displays a button that toggles between light and dark themes.
 * Shows sun icon when in dark mode, moon icon when in light mode.
 *
 * @returns {JSX.Element} Theme toggle button
 */
export function ThemeToggle() {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Current theme: ${theme} (${isDark ? 'Dark' : 'Light'} mode)`}
    >
      {/* Sun icon - visible in dark mode */}
      <div
        className={`absolute transition-all duration-300 ${
          isDark
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-75 rotate-90 pointer-events-none'
        }`}
      >
        <Sun
          className="w-5 h-5 text-yellow-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>

      {/* Moon icon - visible in light mode */}
      <div
        className={`absolute transition-all duration-300 ${
          !isDark
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-75 -rotate-90 pointer-events-none'
        }`}
      >
        <Moon
          className="w-5 h-5 text-indigo-600"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>

      {/* Hidden text for accessibility */}
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );
}

export default ThemeToggle;
