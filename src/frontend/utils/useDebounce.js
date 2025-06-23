// File: src/frontend/utils/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * A custom hook to debounce a value.
 * @param {any} value The value to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {any} The debounced value.
 */
export function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      // Set a timer to update the debounced value after the specified delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Cleanup function to clear the timer if the value changes before the delay has passed
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}