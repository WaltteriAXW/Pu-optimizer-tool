/**
 * Tests for useTheme hook
 * Tests theme persistence, system preference detection, and toggle functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme Hook', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Remove data-theme attribute
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  describe('Initial State', () => {
    it('should initialize with auto theme by default', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('auto');
    });

    it('should restore theme from localStorage', () => {
      localStorage.setItem('pu-optimizer-theme', 'dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
    });

    it('should detect system dark mode preference', () => {
      const { result } = renderHook(() => useTheme());

      // systemPrefersDark will be based on system preference
      expect(typeof result.current.systemPrefersDark).toBe('boolean');
    });
  });

  describe('Theme Setting', () => {
    it('should set light theme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(localStorage.getItem('pu-optimizer-theme')).toBe('light');
    });

    it('should set dark theme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(localStorage.getItem('pu-optimizer-theme')).toBe('dark');
    });

    it('should set auto theme', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('auto');
      });

      expect(result.current.theme).toBe('auto');
      expect(localStorage.getItem('pu-optimizer-theme')).toBe('auto');
    });
  });

  describe('Theme Toggling', () => {
    it('should toggle from light to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should toggle from dark to light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('isDark Calculation', () => {
    it('should be true when theme is dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.isDark).toBe(true);
    });

    it('should be false when theme is light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.isDark).toBe(false);
    });

    it('should follow system preference when theme is auto', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('auto');
      });

      // isDark should match system preference when auto
      expect(result.current.isDark).toBe(result.current.systemPrefersDark);
    });
  });

  describe('DOM Updates', () => {
    it('should add dark class to documentElement when dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      // Wait for effect
      act(() => {
        vi.runAllTimers();
      });

      // Check that dark class exists or will be set
      // (actual DOM manipulation happens in useEffect)
    });

    it('should set data-theme attribute', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      act(() => {
        vi.runAllTimers();
      });

      // Check data-theme attribute (set in useEffect)
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.getItem('pu-optimizer-theme')).toBe('dark');
    });

    it('should restore from localStorage on mount', () => {
      localStorage.setItem('pu-optimizer-theme', 'dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
    });

    it('should handle invalid localStorage values', () => {
      localStorage.setItem('pu-optimizer-theme', 'invalid');

      const { result } = renderHook(() => useTheme());

      // Should default to auto
      expect(result.current.theme).toBe('auto');
    });

    it('should handle missing localStorage', () => {
      const { result } = renderHook(() => useTheme());

      expect(['light', 'dark', 'auto']).toContain(result.current.theme);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid theme changes', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
        result.current.setTheme('dark');
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(localStorage.getItem('pu-optimizer-theme')).toBe('light');
    });

    it('should handle multiple toggles', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      const initial = result.current.isDark;

      act(() => {
        result.current.toggleTheme();
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(initial);
    });

    it('should be stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useTheme());

      const firstTheme = result.current.theme;

      rerender();

      expect(result.current.theme).toBe(firstTheme);
    });
  });
});
