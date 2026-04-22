'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Returns a debounced value that only updates after the specified delay
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a debounced callback function
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update the callback ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Returns a debounced callback with immediate option
 * If immediate is true, the callback is called immediately on the first call
 * and subsequent calls are debounced
 */
export function useDebouncedCallbackImmediate<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number,
  immediate = false
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const isFirstCallRef = useRef(true);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const callNow = immediate && isFirstCallRef.current;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (callNow) {
        callbackRef.current(...args);
        isFirstCallRef.current = false;
      }

      timeoutRef.current = setTimeout(() => {
        if (!immediate) {
          callbackRef.current(...args);
        }
        isFirstCallRef.current = true;
      }, delay);
    },
    [delay, immediate]
  );
}
