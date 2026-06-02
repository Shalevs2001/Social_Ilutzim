import { useState, useCallback } from 'react';

/**
 * Drop-in replacement for useState that persists to localStorage.
 * Accepts an initialValue or an initializer function (same API as useState).
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      return JSON.parse(raw);
    } catch {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((current) => {
        const next = typeof value === 'function' ? value(current) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          console.error(`[useLocalStorage] failed to save "${key}":`, err);
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(typeof initialValue === 'function' ? initialValue() : initialValue);
    } catch (err) {
      console.error(`[useLocalStorage] failed to remove "${key}":`, err);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
