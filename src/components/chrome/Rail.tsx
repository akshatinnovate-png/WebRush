import { useData, useTheme } from '../../hooks';
import { num } from '../../utils/format';
import type { ACTS } from '../../constants/acts';

interface Props {
  acts: typeof ACTS;
  act: number;
  onGo: (n: number) => void;
  onSearch: () => void;
}

/**
 * The index down the left edge. It doubles as a progress marker: the record is
 * read in order, so the numbers are the content, not decoration.
 */
export default function Rail({ acts, act, onGo, onSearch }: Props) {
  const { moments } = useData();
  const { theme, setTheme } = useTheme();
  return (
    <nav className="rail" aria-label="Passes through the record">
      <button className="rail__mark" onClick={() => onGo(0)} aria-label="Back to the start">
        <span aria-hidden="true">CC</span>
      </button>

      <ul className="rail__list">
        {acts.map((a, i) => (
          <li key={a.id}>
            <button
              className={`rail__item${i === act ? ' is-on' : ''}`}
              onClick={() => onGo(i)}
              aria-current={i === act ? 'step' : undefined}
            >
              <span className="rail__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="rail__label">
                <span className="rail__title">{a.label}</span>
                <span className="rail__hint">{a.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="rail__theme" role="group" aria-label="Paper">
        {(['dark', 'system', 'light'] as const).map((t) => (
          <button
            key={t}
            className={`rail__themeB${theme === t ? ' is-on' : ''}`}
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            title={t === 'dark' ? 'Carbon' : t === 'light' ? 'Paper' : 'Match my system'}
          >
            <span className="sr-only">
              {t === 'dark' ? 'Carbon (dark)' : t === 'light' ? 'Paper (light)' : 'Match system'}
            </span>
            <i aria-hidden="true" className={`rail__swatch rail__swatch--${t}`} />
          </button>
        ))}
      </div>

      <button className="rail__search" onClick={onSearch}>
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="rail__searchLabel">
          {moments ? `Search ${num(moments.length)} receipts` : 'Search the record'}
        </span>
        <kbd>⌘K</kbd>
      </button>
    </nav>
  );
}
