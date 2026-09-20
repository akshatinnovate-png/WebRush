import { useCallback, useEffect, useState } from 'react';

/** Carbon, paper, or whatever the operating system prefers. */
export type Theme = 'dark' | 'light' | 'system';

const KEY = 'carbon-copy:theme';

/**
 * Carbon paper or receipt paper.
 *
 * The interface is designed dark, but the whole subject is printed material —
 * so a paper-light mode is not a checkbox, it is the same artefact under a
 * different lamp. The choice persists, and `system` hands control back to the
 * operating system rather than pinning a preference the visitor did not make.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; resolved: 'dark' | 'light' } {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    } catch {
      /* private mode — fall through to the system preference */
    }
    return 'system';
  });

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const resolved: 'dark' | 'light' = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable; the session still honours the choice */
    }
  }, []);

  return { theme, setTheme, resolved };
}
