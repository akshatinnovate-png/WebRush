import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../hooks';
import { num, rupees, secs, shortDate } from '../../utils/format';
import type { Moment } from '../../types';

const STREAM_NAME = ['song', 'ledger', 'card'] as const;
const STREAM_CLASS = ['music', 'ledger', 'place'] as const;

/**
 * Free-text search over every itemised receipt. Opening a result jumps to the
 * day it happened on, which is the point: search is a way into the record,
 * not a list to stare at.
 */
export default function Palette({
  onClose,
  onOpenDay,
}: {
  onClose: () => void;
  onOpenDay: (iso: string) => void;
}) {
  const { moments } = useData();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const deferred = useDeferredValue(q);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo<Moment[]>(() => {
    if (!moments) return [];
    const term = deferred.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: Moment[] = [];
    for (let i = 0; i < moments.length && out.length < 60; i += 1) {
      const m = moments[i];
      if (
        m.title.toLowerCase().includes(term) ||
        m.sub.toLowerCase().includes(term) ||
        m.meta.toLowerCase().includes(term) ||
        m.date.includes(term)
      ) {
        out.push(m);
      }
    }
    return out;
  }, [moments, deferred]);

  useEffect(() => setCursor(0), [deferred]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && results[cursor]) {
      onOpenDay(results[cursor].date);
    }
  };

  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Search the record">
      <button className="palette__scrim" onClick={onClose} aria-label="Close search" tabIndex={-1} />
      <div className="palette__box">
        <label htmlFor="q" className="sr-only">
          Search songs, ledger notes, merchants and towns
        </label>
        <input
          id="q"
          ref={input}
          className="palette__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={moments ? 'milk, Beatles, Kharagpur, 2017-08…' : 'still loading the receipts…'}
          autoComplete="off"
          spellCheck={false}
        />

        {!moments && <p className="palette__hint">The receipts are still arriving.</p>}

        {moments && deferred.trim().length < 2 && (
          <p className="palette__hint">
            {num(moments.length)} itemised receipts. Try a band, a merchant, a town, an
            ingredient, or a date like 2017-08-15.
          </p>
        )}

        {moments && deferred.trim().length >= 2 && results.length === 0 && (
          <p className="palette__hint">
            Nothing matches that. The record only holds what was actually spent, played or
            swiped.
          </p>
        )}

        {results.length > 0 && (
          <ul className="palette__list">
            {results.map((m, i) => (
              <li key={`${m.date}-${m.title}-${i}`}>
                <button
                  className={`palette__item${i === cursor ? ' is-on' : ''}`}
                  onClick={() => onOpenDay(m.date)}
                  onPointerEnter={() => setCursor(i)}
                >
                  <span className={`dot dot--${STREAM_CLASS[m.stream]}`} aria-hidden="true" />
                  <span className="palette__t">
                    {m.title}
                    <small>{m.sub || STREAM_NAME[m.stream]}</small>
                  </span>
                  <span className="palette__v">
                    {m.stream === 0 ? secs(m.value) : rupees(m.value)}
                    <small>{shortDate(m.date)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="palette__foot">
          <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>enter</kbd> to print that day · <kbd>esc</kbd> to
          close
        </p>
      </div>
    </div>
  );
}
