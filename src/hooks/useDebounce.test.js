import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timeout on value change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    // First change
    rerender({ value: 'change1' });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Second change before timeout
    rerender({ value: 'change2' });
    expect(result.current).toBe('initial');

    // Advance past first timeout but not second
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // Advance to second timeout
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('change2');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle multiple rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'v1' } }
    );

    // Rapid changes
    rerender({ value: 'v2' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'v3' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'v4' });
    act(() => vi.advanceTimersByTime(100));

    // Should still be initial
    expect(result.current).toBe('v1');

    // Final timeout
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('v4');
  });

  it('should work with different types', () => {
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    act(() => vi.advanceTimersByTime(100));
    expect(numberResult.current).toBe(42);

    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { a: 1 } } }
    );

    const newObj = { a: 2 };
    objectRerender({ value: newObj });
    act(() => vi.advanceTimersByTime(100));
    expect(objectResult.current).toEqual(newObj);
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Call the debounced function
    act(() => {
      result.current('test');
    });

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now callback should be called
    expect(callback).toHaveBeenCalledWith('test');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous timeout on new call', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // First call
    act(() => {
      result.current('call1');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Second call before timeout
    act(() => {
      result.current('call2');
    });

    // Advance past first timeout
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Complete second timeout
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should only be called with second argument
    expect(callback).toHaveBeenCalledWith('call2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1', 'arg2', 'arg3');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));

    act(() => {
      result.current('test');
    });

    // Unmount before timeout
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Callback should not be called
    expect(callback).not.toHaveBeenCalled();
  });
});
