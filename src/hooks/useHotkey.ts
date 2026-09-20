import { useCallback, useEffect } from 'react';

/** Keyboard shortcut helper (used for the search palette and act paging). */
export function useHotkey(
  match: (e: KeyboardEvent) => boolean,
  handler: () => void,
): void {
  const cb = useCallback(handler, [handler]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (match(e)) {
        e.preventDefault();
        cb();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [match, cb]);
}
