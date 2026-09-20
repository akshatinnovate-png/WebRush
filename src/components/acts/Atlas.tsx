import { useCallback, useMemo, useRef, useState } from 'react';
import { useData } from '../../hooks';
import { useCanvas, useReducedMotion } from '../../hooks';
import { num, pct, rupees } from '../../utils/format';
import type { City, Core, Selection } from '../../types';

/**
 * Where the card went.
 *
 * The bounds are India's, and each dot is a town the card was used in, sized
 * by how often and tinted by how much of that town's spending the cardholder
 * later disputed. Switching to the disputed layer is the moment the map stops
 * looking like a travel history and starts looking like a spill.
 */

const LON_SQUEEZE = Math.cos((22 * Math.PI) / 180);

function mix(a: number[], b: number[], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const MINT = [79, 227, 193];
const VIOLET = [154, 123, 255];

/** Pass 06 — where the card went. */
export default function Atlas({ core, onSelect }: { core: Core; onSelect: (s: Selection) => void }) {
  const { cities } = useData();
  const reduced = useReducedMotion();
  const [disputedOnly, setDisputedOnly] = useState(false);
  const [hover, setHover] = useState<City | null>(null);
  const geometry = useRef<{ x: number; y: number; r: number; city: City }[]>([]);

  /** Frame the towns themselves rather than the whole country box, so the
      landmass fills the panel instead of floating inside the Bay of Bengal. */
  const bounds = useMemo(() => {
    const fallback = { minLat: 6.5, maxLat: 36.5, minLon: 67.5, maxLon: 97.5 };
    if (!cities || cities.length === 0) return fallback;
    return {
      minLat: Math.min(...cities.map((c) => c.lat)) - 0.8,
      maxLat: Math.max(...cities.map((c) => c.lat)) + 0.8,
      minLon: Math.min(...cities.map((c) => c.lon)) - 0.8,
      maxLon: Math.max(...cities.map((c) => c.lon)) + 0.8,
    };
  }, [cities]);

  const max = useMemo(
    () => ({
      swipes: Math.max(1, ...(cities?.map((c) => c.swipes) ?? [1])),
      disputed: Math.max(1, ...(cities?.map((c) => c.disputed) ?? [1])),
    }),
    [cities],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, size: { w: number; h: number }, t: number) => {
      if (!cities) return;

      const spanX = (bounds.maxLon - bounds.minLon) * LON_SQUEEZE;
      const spanY = bounds.maxLat - bounds.minLat;
      const scale = Math.min((size.w * 0.92) / spanX, (size.h * 0.94) / spanY);
      const ox = size.w / 2 - (spanX * scale) / 2;
      const oy = size.h / 2 - (spanY * scale) / 2;
      const px = (lon: number) => ox + (lon - bounds.minLon) * LON_SQUEEZE * scale;
      const py = (lat: number) => oy + (bounds.maxLat - lat) * scale;

      // graticule
      ctx.strokeStyle = 'rgba(160,130,190,0.09)';
      ctx.lineWidth = 1;
      for (let lat = 10; lat <= 35; lat += 5) {
        ctx.beginPath();
        ctx.moveTo(px(bounds.minLon), py(lat));
        ctx.lineTo(px(bounds.maxLon), py(lat));
        ctx.stroke();
      }
      for (let lon = 70; lon <= 95; lon += 5) {
        ctx.beginPath();
        ctx.moveTo(px(lon), py(bounds.minLat));
        ctx.lineTo(px(lon), py(bounds.maxLat));
        ctx.stroke();
      }

      const geo: typeof geometry.current = [];
      const sorted = [...cities].sort((a, b) => a.swipes - b.swipes);

      for (const c of sorted) {
        const share = c.swipes > 0 ? c.disputed / c.swipes : 0;
        if (disputedOnly && c.disputed === 0) continue;
        const basis = disputedOnly ? c.disputed / max.disputed : c.swipes / max.swipes;
        const r = 2.2 + 11 * Math.sqrt(basis);
        const x = px(c.lon);
        const y = py(c.lat);
        geo.push({ x, y, r: Math.max(r, 7), city: c });

        const ink = disputedOnly ? mix(VIOLET, [255, 255, 255], 0.12) : mix(MINT, VIOLET, share);
        const pulse = reduced ? 0 : (Math.sin(t * 1.6 + c.lat + c.lon) * 0.5 + 0.5) * share;

        ctx.beginPath();
        ctx.arc(x, y, r + pulse * 5, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.14 + share * 0.2;
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        if (r > 5) {
          ctx.shadowColor = ink;
          ctx.shadowBlur = 14;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      geometry.current = geo;

      if (hover) {
        const g = geo.find((n) => n.city.name === hover.name);
        if (g) {
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
          ctx.textAlign = g.x > size.w - 140 ? 'right' : 'left';
          const tx = g.x + (g.x > size.w - 140 ? -g.r - 10 : g.r + 10);
          const label = `${hover.name} · ${hover.disputed}/${hover.swipes} disputed`;
          const wpx = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(18,12,24,0.88)';
          ctx.fillRect(
            ctx.textAlign === 'right' ? tx - wpx - 6 : tx - 6,
            g.y - 17,
            wpx + 12,
            21,
          );
          ctx.fillStyle = '#ece3f4';
          ctx.fillText(label, tx, g.y - 2);
        }
      }
    },
    [cities, bounds, disputedOnly, hover, max, reduced],
  );

  const [canvasRef, wrapRef] = useCanvas(draw, true);

  const pick = (e: React.PointerEvent<HTMLDivElement>): City | null => {
    const box = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - box.left;
    const my = e.clientY - box.top;
    let best: City | null = null;
    let bestD = Infinity;
    for (const g of geometry.current) {
      const d = Math.hypot(g.x - mx, g.y - my);
      if (d < g.r + 6 && d < bestD) {
        bestD = d;
        best = g.city;
      }
    }
    return best;
  };

  if (!cities) {
    return (
      <article className="act act--pad">
        <p className="loading" role="status">
          Plotting the trail…
        </p>
      </article>
    );
  }

  const totalSwipes = cities.reduce((a, c) => a + c.swipes, 0);
  const totalDisputed = cities.reduce((a, c) => a + c.disputed, 0);
  const worst = [...cities].sort((a, b) => b.disputed - a.disputed).slice(0, 10);

  return (
    <article className="act act--full">
      <header className="act__head">
        <h2 className="h-act">
          <span className="h-act__n">06</span> Where the card went
        </h2>
        <p className="h-act__sub">
          {num(cities.length)} towns, {num(totalSwipes)} charges between them, two years.
          Dots grow with use and turn violet as the disputed share climbs.
        </p>
      </header>

      <div className="chips">
        <button
          className={`chip${!disputedOnly ? ' is-on' : ''}`}
          style={{ '--ink': 'var(--place)' } as React.CSSProperties}
          aria-pressed={!disputedOnly}
          onClick={() => setDisputedOnly(false)}
        >
          <i aria-hidden="true" />
          Every swipe <b>{num(totalSwipes)}</b>
        </button>
        <button
          className={`chip${disputedOnly ? ' is-on' : ''}`}
          style={{ '--ink': 'var(--ghost)' } as React.CSSProperties}
          aria-pressed={disputedOnly}
          onClick={() => setDisputedOnly(true)}
        >
          <i aria-hidden="true" />
          Only the disputed ones <b>{num(totalDisputed)}</b>
        </button>
      </div>

      <div
        className="canvasWrap canvasWrap--map"
        ref={wrapRef}
        onPointerMove={(e) => setHover(pick(e))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => {
          const c = pick(e);
          if (c) onSelect({ kind: 'city', city: c });
        }}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>

      <div className="atlas__foot">
        <p className="fine">
          {pct(totalDisputed / totalSwipes)} of the trail is disputed, and no single town
          carries it. The extremes are the odd part: in {core.ghost.townsFull} towns every
          single charge was disputed, and in {core.ghost.townsNone} others not one was.
          Whatever decides it is not geography.
        </p>
        <ul className="atlas__top" aria-label="Towns with the most disputed charges">
          {worst.map((c) => (
            <li key={c.name}>
              <button onClick={() => onSelect({ kind: 'city', city: c })}>
                <span>{c.name}</span>
                <span className="atlas__bar">
                  <i style={{ width: `${(c.disputed / worst[0].disputed) * 100}%` }} />
                </span>
                <span className="atlas__v">
                  {c.disputed}/{c.swipes} · {rupees(c.amount, true)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="sr-only">
        The card was used in {cities.length} towns across {core.ghost.states} states between{' '}
        {core.ghost.first} and {core.ghost.last}.
      </p>
    </article>
  );
}
