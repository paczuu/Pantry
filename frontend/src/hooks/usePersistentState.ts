import { useCallback, useState } from 'react';

/** `useState` that is mirrored to localStorage (JSON), so a UI preference survives reloads on this device. */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode / quota): keep the in-memory value
      }
    },
    [key]
  );

  return [value, update];
}
