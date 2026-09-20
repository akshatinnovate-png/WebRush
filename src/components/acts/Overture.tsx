import { useCallback, useMemo, useRef } from 'react';
import { useCanvas, useCountUp, useReducedMotion } from '../../hooks';
import { num, rupees } from '../../utils/format';
import type { Core } from '../../types';

interface Dot {
  x: number;
  y: number;
  hx: number;
  hy: number;
  vx: number;
  vy: number;
  c: string;
  s: number;
}

/**
 * The title is printed the way a dot-matrix head would print it, and every dot
 * is one of the three records. The mix of colours is the real mix of the data:
 * 93% of this life is music, 5% card swipes, 1.5% the household ledger — so
 * the word "Carbon" comes out overwhelmingly pink and you can see the other
 * two streams speckled through it before a single number is quoted.
 */
const INK = ['#ff5c8a', '#ffb13c', '#4fe3c1', '#9a7bff'] as const;

function pickInk(core: Core): string {
  const { plays, ledgerRows, cardRows } = core.meta;
  const ghost = core.ghost.count;
  const total = plays + ledgerRows + cardRows;
  const r = Math.random() * total;
  if (r < plays) return INK[0];
  if (r < plays + ledgerRows) return INK[1];
  return r < plays + ledgerRows + (cardRows - ghost) ? INK[2] : INK[3];
}

function sampleText(w: number, h: number, core: Core): Dot[] {
  const off = document.createElement('canvas');
  const scale = 0.5; // sample at half resolution, then map up — cheaper, same look
  off.width = Math.max(1, Math.floor(w * scale));
  off.height = Math.max(1, Math.floor(h * scale));
  const g = off.getContext('2d');
  if (!g) return [];

  const stacked = w < 760;
  const lines = stacked ? ['CARBON', 'COPY'] : ['CARBON COPY'];
  const longest = Math.max(...lines.map((l) => l.length));
  // JetBrains Mono advances at ~0.6em, so this solves for a snug fit.
  const size = Math.min((off.width * 0.94) / (longest * 0.6), off.height / (lines.length * 1.25));

  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${size}px "JetBrains Mono", ui-monospace, monospace`;
  const lead = size * 1.02;
  const top = off.height / 2 - ((lines.length - 1) * lead) / 2;
  lines.forEach((line, i) => g.fillText(line, off.width / 2, top + i * lead));

  const { data } = g.getImageData(0, 0, off.width, off.height);
  const step = off.width > 520 ? 3 : 2;
  const dots: Dot[] = [];
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] < 130) continue;
      const hx = x / scale;
      const hy = y / scale;
      const a = Math.random() * Math.PI * 2;
      const d = 240 + Math.random() * 620;
      dots.push({
        x: hx + Math.cos(a) * d,
        y: hy + Math.sin(a) * d,
        hx,
        hy,
        vx: 0,
        vy: 0,
        c: pickInk(core),
        s: step / scale > 5 ? 2.4 : 1.9,
      });
    }
  }
  return dots;
}

/** Pass 01 — what was collected. */
export default function Overture({ core, onGo }: { core: Core; onGo: () => void }) {
  const reduced = useReducedMotion();
  const dots = useRef<{ key: string; list: Dot[] }>({ key: '', list: [] });
  const pointer = useRef<{ x: number; y: number; on: boolean }>({ x: 0, y: 0, on: false });

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, size: { w: number; h: number }) => {
      const key = `${size.w}x${size.h}`;
      if (dots.current.key !== key) {
        dots.current = { key, list: sampleText(size.w, size.h, core) };
        if (reduced) dots.current.list.forEach((d) => ((d.x = d.hx), (d.y = d.hy)));
      }

      const list = dots.current.list;
      const p = pointer.current;

      for (let i = 0; i < list.length; i += 1) {
        const d = list[i];
        if (!reduced) {
          // spring home
          d.vx += (d.hx - d.x) * 0.014;
          d.vy += (d.hy - d.y) * 0.014;
          if (p.on) {
            const dx = d.x - p.x;
            const dy = d.y - p.y;
            const r2 = dx * dx + dy * dy;
            if (r2 < 13000 && r2 > 0.01) {
              const f = (1 - r2 / 13000) * 2.6;
              const inv = 1 / Math.sqrt(r2);
              d.vx += dx * inv * f;
              d.vy += dy * inv * f;
            }
          }
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x += d.vx;
          d.y += d.vy;
        }
        ctx.fillStyle = d.c;
        ctx.fillRect(d.x, d.y, d.s, d.s);
      }
    },
    [core, reduced],
  );

  const [canvasRef, wrapRef] = useCanvas(draw, !reduced);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    pointer.current = { x: e.clientX - box.left, y: e.clientY - box.top, on: true };
  };

  const m = core.meta;
  const years = useMemo(() => (m.spanDays / 365.25).toFixed(1), [m.spanDays]);
  const receipts = useCountUp(m.receipts, true, 1600);

  return (
    <article className="act act--overture">
      <h1 className="sr-only">Carbon Copy — a decade of receipts, reassembled</h1>

      <div
        className="hero"
        ref={wrapRef}
        onPointerMove={onMove}
        onPointerLeave={() => (pointer.current.on = false)}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>

      <div className="overture__body">
        <p className="lede">
          Somebody left {num(m.receipts)} receipts behind between {m.from.slice(0, 4)} and{' '}
          {m.to.slice(0, 4)}. Nobody wrote a diary. This is what the receipts say instead.
        </p>

        <dl className="ticker" aria-label="What was collected">
          <div>
            <dt>receipts recovered</dt>
            <dd className="ticker__big">{num(receipts)}</dd>
          </div>
          <div>
            <dt>songs played</dt>
            <dd>{num(m.plays)}</dd>
          </div>
          <div>
            <dt>ledger entries</dt>
            <dd>{num(m.ledgerRows)}</dd>
          </div>
          <div>
            <dt>card swipes</dt>
            <dd>{num(m.cardRows)}</dd>
          </div>
          <div>
            <dt>artists</dt>
            <dd>{num(m.artists)}</dd>
          </div>
          <div>
            <dt>years covered</dt>
            <dd>{years}</dd>
          </div>
        </dl>

        <div className="sources">
          <h2 className="h-sub">Three records, one person</h2>
          <ol className="sources__list">
            <li style={{ '--ink': 'var(--music)' } as React.CSSProperties}>
              <strong>Listening history.</strong> {num(m.plays)} plays, {num(m.minutes / 60)} hours,{' '}
              {num(m.tracks)} distinct tracks across six devices. Starts on a browser tab in July 2013.
            </li>
            <li style={{ '--ink': 'var(--ledger)' } as React.CSSProperties}>
              <strong>A household ledger.</strong> {num(m.ledgerRows)} hand-entered lines,{' '}
              {rupees(m.ledgerSpend, true)} of spending, mostly in amounts under ₹100. Runs 2015 to 2018, then stops.
            </li>
            <li style={{ '--ink': 'var(--place)' } as React.CSSProperties}>
              <strong>A card trail.</strong> {num(m.cardRows)} swipes across{' '}
              {num(core.ghost.cities)} towns, 2022 to 2024 — {core.ghost.count.toLocaleString('en-IN')} of
              which the bank marked as not theirs.
            </li>
          </ol>
          <p className="fine">
            The three records barely overlap. That gap is the point: a life is only legible
            when you stack the fragments on top of each other.
          </p>
        </div>

        <button className="btn btn--lead" onClick={onGo}>
          Open the record
        </button>
        <p className="fine fine--center">
          Press <kbd>]</kbd> and <kbd>[</kbd> to move between passes, <kbd>⌘K</kbd> to search everything.
        </p>
      </div>
    </article>
  );
}
