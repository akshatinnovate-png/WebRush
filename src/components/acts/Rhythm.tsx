import { useMemo, useState } from 'react';
import { clockTime, num, pct, rupees } from '../../utils/format';
import type { Core } from '../../types';

/**
 * When does this life actually happen?
 *
 * The dial answers it in one shape. Hour 0 sits at the top and the petals run
 * clockwise, so the bulge across the bottom-left is the small hours — this is
 * a record that peaks at 11pm and midnight and nearly flatlines at lunchtime.
 */

const R0 = 54;
const R1 = 150;
const SIZE = 340;

function wedge(a0: number, a1: number, r0: number, r1: number): string {
  const c = SIZE / 2;
  const p = (a: number, r: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [c + Math.cos(rad) * r, c + Math.sin(rad) * r];
  };
  const [x0, y0] = p(a0, r1);
  const [x1, y1] = p(a1, r1);
  const [x2, y2] = p(a1, r0);
  const [x3, y3] = p(a0, r0);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z`;
}

/** Pass 05 — when this life actually happens. */
export default function Rhythm({ core }: { core: Core }) {
  const [hour, setHour] = useState(23);

  const peak = useMemo(
    () => ({
      plays: Math.max(...core.clock.map((c) => c.plays)),
      spend: Math.max(...core.clock.map((c) => c.spend)),
      week: Math.max(...core.weekday.map((w) => w.mins)),
    }),
    [core],
  );

  const sel = core.clock[hour];
  const totalPlays = core.clock.reduce((a, c) => a + c.plays, 0);
  const night = core.clock.slice(0, 5).reduce((a, c) => a + c.plays, 0);

  return (
    <article className="act act--pad">
      <header className="act__head">
        <h2 className="h-act">
          <span className="h-act__n">05</span> The shape of a day
        </h2>
        <p className="h-act__sub">
          Every play and every rupee, folded into twenty-four hours. Hover a petal, or pick an
          hour from the strip.
        </p>
      </header>

      <div className="rhythm">
        <figure className="dial">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Plays by hour of day">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R1 + 12} className="dial__rim" />
            {core.clock.map((c) => {
              const a0 = c.h * 15 + 1;
              const a1 = (c.h + 1) * 15 - 1;
              const r = R0 + (R1 - R0) * Math.sqrt(c.plays / peak.plays);
              return (
                <path
                  key={c.h}
                  d={wedge(a0, a1, R0, r)}
                  className={`dial__petal${c.h === hour ? ' is-on' : ''}`}
                  onPointerEnter={() => setHour(c.h)}
                />
              );
            })}
            {core.clock.map((c) => {
              const a0 = c.h * 15 + 4;
              const a1 = (c.h + 1) * 15 - 4;
              const r = 14 + 34 * Math.sqrt(c.spend / peak.spend);
              return <path key={`s${c.h}`} d={wedge(a0, a1, 14, r)} className="dial__spend" />;
            })}
            {[0, 6, 12, 18].map((h) => {
              const rad = ((h * 15 - 90) * Math.PI) / 180;
              return (
                <text
                  key={h}
                  x={SIZE / 2 + Math.cos(rad) * (R1 + 26)}
                  y={SIZE / 2 + Math.sin(rad) * (R1 + 26)}
                  className="dial__tick"
                >
                  {clockTime(h)}
                </text>
              );
            })}
          </svg>
          <figcaption className="dial__read" aria-live="polite">
            <b>{clockTime(hour)}</b>
            <span>
              {num(sel.plays)} plays · {pct(sel.plays / totalPlays)} of everything
            </span>
            <span>
              {sel.skip !== null ? `${pct(sel.skip, 0)} of them skipped` : '—'} ·{' '}
              {rupees(sel.spend, true)} spent in this hour across eleven years
            </span>
          </figcaption>
        </figure>

        <div className="rhythm__side">
          <ul className="hourStrip" aria-label="Choose an hour">
            {core.clock.map((c) => (
              <li key={c.h}>
                <button
                  className={`hourStrip__b${c.h === hour ? ' is-on' : ''}`}
                  style={{ '--h': `${Math.round((c.plays / peak.plays) * 100)}%` } as React.CSSProperties}
                  onClick={() => setHour(c.h)}
                  aria-pressed={c.h === hour}
                >
                  <span className="sr-only">{clockTime(c.h)}</span>
                  <i aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <p className="rhythm__note">
            {pct(night / totalPlays)} of every song ever played here started between midnight and
            5am. The four hours from 9am to 1pm account for {pct(
              core.clock.slice(9, 13).reduce((a, c) => a + c.plays, 0) / totalPlays,
            )}
            .
          </p>

          <h3 className="h-sub">By weekday</h3>
          <ul className="week">
            {core.weekday.map((w) => (
              <li key={w.d}>
                <span className="week__d">{w.d}</span>
                <span className="week__bar">
                  <i style={{ width: `${(w.mins / peak.week) * 100}%` }} />
                </span>
                <span className="week__v">{num(Math.round(w.mins / 60))} h</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="h-sub h-sub--wide">Six things the receipts admit</h3>
      <ul className="findings">
        {core.findings.map((f) => (
          <li key={f.k} className={`finding finding--${f.k}`}>
            <p className="finding__n">{f.n}</p>
            <p className="finding__u">{f.u}</p>
            <h4>{f.t}</h4>
            <p className="finding__d">{f.d}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
