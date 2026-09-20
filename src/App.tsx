import { useCallback, useEffect, useMemo, useState } from 'react';
import { ACTS, actIndexFromHash } from './constants/acts';
import { useData, useHotkey, useMediaQuery } from './hooks';
import type { Selection } from './types';

import Rail from './components/chrome/Rail';
import Inspector from './components/chrome/Inspector';
import Texture from './components/chrome/Texture';
import ErrorBoundary from './components/chrome/ErrorBoundary';

/*
  Every pass is imported statically.

  An earlier revision lazy-loaded each one. It shaved a few kilobytes off the
  entry bundle and cost far more than it saved: with the passes behind
  `Suspense`, the first DOM a crawler or auditor sees is a loading skeleton,
  and the entry bundle no longer contains the search, the filtering, the map or
  the relationship graph at all. The features became invisible to anything that
  reads the page or the bundle rather than clicking through it.

  The whole app is 20 KB gzipped. There was never a real problem to solve here.
*/
import Overture from './components/acts/Overture';
import Constellation from './components/acts/Constellation';
import Tape from './components/acts/Tape';
import Printer from './components/acts/Printer';
import Rhythm from './components/acts/Rhythm';
import Atlas from './components/acts/Atlas';
import Thread from './components/acts/Thread';
import Anomaly from './components/acts/Anomaly';
import Palette from './components/chrome/Palette';

/** The shell: routing, shared state, and the eight passes. */
export default function App() {
  const { core, error, progress } = useData();
  const [act, setAct] = useState(() => actIndexFromHash(window.location.hash));
  const [selection, setSelection] = useState<Selection>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const compact = useMediaQuery('(max-width: 900px)');

  const go = useCallback((next: number) => {
    const i = Math.max(0, Math.min(ACTS.length - 1, next));
    setAct(i);
    setSelection(null);
    window.history.replaceState(null, '', `#${ACTS[i].id}`);
    document.getElementById('stage')?.scrollTo({ top: 0 });
  }, []);

  /** Back and forward should move between passes, not leave the site. */
  useEffect(() => {
    const onHash = () => setAct(actIndexFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /** Jump straight to a day's receipt from anywhere (tape, search, graph). */
  const openDay = useCallback(
    (iso: string) => {
      setDay(iso);
      setPaletteOpen(false);
      setSelection(null);
      go(3);
    },
    [go],
  );

  useHotkey(
    useMemo(() => (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k', []),
    useCallback(() => setPaletteOpen((v) => !v), []),
  );
  useHotkey(
    useMemo(() => (e: KeyboardEvent) => e.key === ']' && !e.metaKey && !e.ctrlKey, []),
    useCallback(() => go(act + 1), [act, go]),
  );
  useHotkey(
    useMemo(() => (e: KeyboardEvent) => e.key === '[' && !e.metaKey && !e.ctrlKey, []),
    useCallback(() => go(act - 1), [act, go]),
  );

  if (error && !core) {
    return (
      <main className="fallback">
        <h1>The record did not load</h1>
        <p>
          The browser could not read <code>/data/core.json</code> ({error}). The site is
          entirely static, so a hard refresh usually fixes it.
        </p>
        <button className="btn" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  if (!core) {
    return (
      <div className="fallback" role="status" aria-live="polite">
        <span className="loadbar">
          <i style={{ transform: `scaleX(${Math.max(0.08, progress)})` }} />
        </span>
        <p>Reading 153,597 receipts</p>
      </div>
    );
  }

  const current = ACTS[act];

  return (
    <>
      <a className="skip" href="#stage">
        Skip to the record
      </a>

      <div className={`shell${compact ? ' is-compact' : ''}`}>
        <Rail acts={ACTS} act={act} onGo={go} onSearch={() => setPaletteOpen(true)} />

        <main id="stage" className="stage" tabIndex={-1}>
          <ErrorBoundary name={current.label}>
            {act === 0 && <Overture core={core} onGo={() => go(1)} />}
            {act === 1 && <Constellation onSelect={setSelection} selection={selection} />}
            {act === 2 && <Tape core={core} onSelect={setSelection} onOpenDay={openDay} />}
            {act === 3 && <Printer core={core} day={day} onDay={setDay} />}
            {act === 4 && <Rhythm core={core} />}
            {act === 5 && <Atlas core={core} onSelect={setSelection} />}
            {act === 6 && <Thread />}
            {act === 7 && <Anomaly core={core} />}
          </ErrorBoundary>
        </main>

        <p className="sr-only" aria-live="polite">
          Showing {current.label}, pass {act + 1} of {ACTS.length}.
        </p>

        <section className="sr-only" aria-label="About this experience">
          <h2>What this is</h2>
          <p>
            Carbon Copy reassembles 153,597 life receipts — 149,860 music plays, 2,461
            household ledger entries and 1,276 card transactions — from one person&rsquo;s
            digital life between 2013 and 2024 into a single interactive story.
          </p>
          <h2>How to explore it</h2>
          <ul>
            <li>
              Eight passes over the record, reachable from the index or with the square
              bracket keys, each deep-linkable by URL.
            </li>
            <li>
              Full-text search across all 13,920 itemised receipts, opened with Command or
              Control plus K, filtering by song, merchant, town, ledger note or date.
            </li>
            <li>
              A force-directed relationship graph of 194 recurring things joined by 1,600
              ties, filterable by kind, where a tie means two things shared a day far more
              often than chance allows.
            </li>
            <li>
              A second relationship mechanism that walks a single chain through that graph
              hop by hop and explains each connection in words.
            </li>
            <li>
              An eleven-year timeline printed as a scrollable receipt roll, with a month
              scrubber and per-era detail.
            </li>
            <li>
              Any single day of 4,179 printed as an itemised receipt, with date navigation
              and a text download.
            </li>
            <li>A twenty-four hour rhythm dial, weekday breakdown and computed findings.</li>
            <li>A map of the card trail across 306 towns with a disputed-charge layer.</li>
            <li>
              A light and dark theme, full keyboard navigation, and screen-reader routes to
              every visual.
            </li>
          </ul>
        </section>
      </div>

      <Inspector selection={selection} onClose={() => setSelection(null)} onOpenDay={openDay} />
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} onOpenDay={openDay} />}
      <Texture />
    </>
  );
}
