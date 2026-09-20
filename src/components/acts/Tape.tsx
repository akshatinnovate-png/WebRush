import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../hooks';
import { useReducedMotion, useSize } from '../../hooks';
import { monthLabel, num, rupees } from '../../utils/format';
import type { Core, Selection } from '../../types';

/**
 * Eleven and a half years printed onto one continuous roll.
 *
 * Music grows upward from the fold and money downward, which makes the shape
 * of the decade obvious at a glance: the ledger years and the listening years
 * barely share a column, and the violet that creeps into the last stretch is
 * spending the cardholder disputed.
 */

const COL = 26;
const PAD = 56;
const FOLD = 0.52;

interface Props {
  core: Core;
  onSelect: (s: Selection) => void;
  onOpenDay: (iso: string) => void;
}

/** Pass 03 — eleven years printed on one roll. */
export default function Tape({ core, onSelect, onOpenDay }: Props) {
  const { days } = useData();
  const reduced = useReducedMotion();
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Opening on the last month showed an empty readout. Start on the fullest
  // month instead — the one with the most listening and spending combined.
  const [idx, setIdx] = useState<number>(() => {
    const topMusic = Math.max(...core.months.map((m) => m[2])) || 1;
    const topMoney = Math.max(...core.months.map((m) => m[3] + m[4])) || 1;
    let best = 0;
    let bestScore = -1;
    core.months.forEach((m, i) => {
      const v = m[2] / topMusic + (m[3] + m[4]) / topMoney;
      if (v > bestScore) {
        bestScore = v;
        best = i;
      }
    });
    return best;
  });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const months = core.months;
  const width = PAD * 2 + months.length * COL;
  const height = Math.max(300, Math.min(460, size.h || 380));

  const peaks = useMemo(
    () => ({
      music: Math.max(...months.map((m) => m[2])) || 1,
      money: Math.max(...months.map((m) => m[3] + m[4])) || 1,
    }),
    [months],
  );

  /** Where each era starts and ends, in column space. */
  const bands = useMemo(
    () =>
      core.eras.map((e) => {
        const from = months.findIndex((m) => m[0] >= e.from.slice(0, 7));
        let to = months.findIndex((m) => m[0] > e.to.slice(0, 7));
        if (to < 0) to = months.length;
        return { era: e, from: from < 0 ? 0 : from, to };
      }),
    [core.eras, months],
  );

  const paint = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(width * dpr);
    c.height = Math.floor(height * dpr);
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fold = height * FOLD;

    // paper
    ctx.fillStyle = '#f4efe3';
    ctx.fillRect(0, 0, width, height);

    // torn edges, top and bottom
    ctx.fillStyle = '#120c18';
    for (let x = 0; x < width; x += 11) {
      ctx.beginPath();
      ctx.arc(x, 0, 4.2, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, height, 4.2, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // era bands
    bands.forEach((b, i) => {
      const x0 = PAD + b.from * COL;
      const x1 = PAD + b.to * COL;
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(36,28,24,0.045)';
        ctx.fillRect(x0, 14, x1 - x0, height - 28);
      }
      ctx.strokeStyle = 'rgba(36,28,24,0.22)';
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0, height - 14);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(36,28,24,0.82)';
      ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(b.era.name.toUpperCase(), x0 + 8, 30);
      ctx.fillStyle = 'rgba(36,28,24,0.45)';
      ctx.font = '400 10px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(`${b.era.from.slice(0, 4)}–${b.era.to.slice(0, 4)}`, x0 + 8, 44);
    });

    // the fold line the two measures hang from
    ctx.strokeStyle = 'rgba(36,28,24,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD - 16, fold);
    ctx.lineTo(width - PAD + 16, fold);
    ctx.stroke();

    const upMax = fold - 62;
    const downMax = height - fold - 46;

    months.forEach((m, i) => {
      const x = PAD + i * COL;
      const [ym, , mins, ledger, card, ghost] = m;
      const focused = i === idx || i === hoverIdx;

      if (focused) {
        ctx.fillStyle = 'rgba(36,28,24,0.08)';
        ctx.fillRect(x - 1, 14, COL - 2, height - 28);
      }

      // music, upward
      const hm = (mins / peaks.music) * upMax;
      ctx.fillStyle = focused ? '#e01f56' : '#ff5c8a';
      ctx.fillRect(x + 3, fold - hm, COL - 9, hm);

      // money, downward: ledger then card, with the disputed part on top
      const hl = (ledger / peaks.money) * downMax;
      const hc = (card / peaks.money) * downMax;
      const hg = (ghost / peaks.money) * downMax;
      let y = fold;
      if (hl > 0) {
        ctx.fillStyle = '#e08a12';
        ctx.fillRect(x + 3, y, COL - 9, hl);
        y += hl;
      }
      if (hc > 0) {
        ctx.fillStyle = '#17a98d';
        ctx.fillRect(x + 3, y, COL - 9, hc - hg);
        ctx.fillStyle = '#7b57f5';
        ctx.fillRect(x + 3, y + (hc - hg), COL - 9, hg);
      }

      // year ticks along the fold
      if (ym.endsWith('-01')) {
        ctx.fillStyle = 'rgba(36,28,24,0.75)';
        ctx.font = '700 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ym.slice(0, 4), x + COL / 2 - 2, fold + 14);
        ctx.strokeStyle = 'rgba(36,28,24,0.3)';
        ctx.beginPath();
        ctx.moveTo(x, fold - 5);
        ctx.lineTo(x, fold + 3);
        ctx.stroke();
      }
    });

    // selected column readout, printed on the paper itself
    const sel = months[idx];
    if (sel) {
      const x = PAD + idx * COL + COL / 2;
      ctx.strokeStyle = 'rgba(36,28,24,0.75)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 52);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#241c18';
      ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = x > width - 160 ? 'right' : 'left';
      const tx = x + (x > width - 160 ? -8 : 8);
      ctx.fillText(monthLabel(sel[0]), tx, 64);
    }
  }, [bands, height, hoverIdx, idx, months, peaks, width]);

  useEffect(() => {
    paint();
  }, [paint]);

  // keep the chosen month in view when it moves via keyboard or the scrubber
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const x = PAD + idx * COL;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    if (x < left + 80 || x > right - 80) {
      el.scrollTo({
        left: Math.max(0, x - el.clientWidth / 2),
        behavior: reduced ? 'auto' : 'smooth',
      });
    }
  }, [idx, reduced]);

  const fromX = (clientX: number): number => {
    const c = canvasRef.current;
    if (!c) return idx;
    const box = c.getBoundingClientRect();
    return Math.max(0, Math.min(months.length - 1, Math.floor((clientX - box.left - PAD) / COL)));
  };

  const m = months[idx];
  const era = core.eras.find((e) => m[0] >= e.from.slice(0, 7) && m[0] <= e.to.slice(0, 7));

  /** The busiest day inside the selected month — the one worth printing. */
  const bestDay = useMemo(() => {
    if (!days) return null;
    const inMonth = days.filter((d) => d.date.startsWith(m[0]));
    if (inMonth.length === 0) return null;
    return inMonth.reduce((a, b) =>
      b.plays + b.ledgerN * 20 + b.cardN * 20 > a.plays + a.ledgerN * 20 + a.cardN * 20 ? b : a,
    ).date;
  }, [days, m]);

  return (
    <article className="act act--full">
      <header className="act__head">
        <h2 className="h-act">
          <span className="h-act__n">03</span> The whole roll
        </h2>
        <p className="h-act__sub">
          Listening rises above the fold, spending hangs below it. Drag the roll, or use the
          scrubber underneath.
        </p>
      </header>

      <div className="tape" ref={wrapRef}>
        <div className="tape__scroll" ref={scrollRef}>
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            onPointerMove={(e) => setHoverIdx(fromX(e.clientX))}
            onPointerLeave={() => setHoverIdx(null)}
            onPointerDown={(e) => setIdx(fromX(e.clientX))}
          />
        </div>
      </div>

      <div className="scrub">
        <label className="scrub__label" htmlFor="scrub">
          Month
        </label>
        <input
          id="scrub"
          type="range"
          min={0}
          max={months.length - 1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          aria-valuetext={monthLabel(m[0])}
        />
        <output htmlFor="scrub">{monthLabel(m[0])}</output>
      </div>

      <div className="tape__read">
        <div className="tape__stats">
          <div>
            <span className="k">listened</span>
            <b style={{ color: 'var(--music)' }}>{num(m[2])} min</b>
            <small>{num(m[1])} plays</small>
          </div>
          <div>
            <span className="k">ledger</span>
            <b style={{ color: 'var(--ledger)' }}>{rupees(m[3], true)}</b>
            <small>{m[3] > 0 ? 'hand-entered' : 'no ledger kept'}</small>
          </div>
          <div>
            <span className="k">card</span>
            <b style={{ color: 'var(--place)' }}>{rupees(m[4], true)}</b>
            <small>{m[4] > 0 ? 'swiped' : 'no card trail'}</small>
          </div>
          <div>
            <span className="k">disputed</span>
            <b style={{ color: 'var(--ghost)' }}>{rupees(m[5], true)}</b>
            <small>{m[4] > 0 ? `${Math.round((m[5] / m[4]) * 100)}% of the month` : '—'}</small>
          </div>
        </div>

        {era && (
          <div className="tape__era">
            <h3>{era.name}</h3>
            <p>{era.blurb}</p>
            <div className="tape__actions">
              <button className="btn btn--small" onClick={() => onSelect({ kind: 'era', era })}>
                Open this era
              </button>
              {bestDay && (
                <button className="btn btn--small btn--quiet" onClick={() => onOpenDay(bestDay)}>
                  Print the busiest day of {monthLabel(m[0])}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
