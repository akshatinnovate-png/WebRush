import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../hooks';
import { useCanvas, useReducedMotion } from '../../hooks';
import { num } from '../../utils/format';
import type { NodeKind, Selection } from '../../types';

/**
 * Every node is something that recurs in this life — a band, a line item in
 * the household ledger, a town the card visited, a class of merchant. An edge
 * means the two turned up on the same day far more often than chance allows,
 * so the layout pulls genuinely entangled things together: the auto fare sits
 * beside the band that was playing on the way home.
 *
 * The edge weight from the pipeline is lift, not raw co-occurrence, which is
 * what stops The Beatles from being wired to absolutely everything.
 */

const KIND: Record<NodeKind, { ink: string; label: string; unit: string }> = {
  artist: { ink: '#ff5c8a', label: 'Bands', unit: 'plays' },
  ledger: { ink: '#ffb13c', label: 'Ledger lines', unit: 'entries' },
  place: { ink: '#4fe3c1', label: 'Towns', unit: 'swipes' },
  spend: { ink: '#9a7bff', label: 'Merchant classes', unit: 'charges' },
};
const KINDS = Object.keys(KIND) as NodeKind[];

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Props {
  onSelect: (s: Selection) => void;
  selection: Selection;
}

/** Pass 02 — things that keep happening together. */
export default function Constellation({ onSelect, selection }: Props) {
  const { graph } = useData();
  const reduced = useReducedMotion();
  const [on, setOn] = useState<Record<NodeKind, boolean>>({
    artist: true,
    ledger: true,
    place: true,
    spend: true,
  });
  const [hover, setHover] = useState<number | null>(null);

  const bodies = useRef<Body[]>([]);
  const view = useRef({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ mode: 'none' | 'pan' | 'node'; id: number; moved: number }>({
    mode: 'none',
    id: -1,
    moved: 0,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  // Stable identities: `graph?.nodes ?? []` would be a fresh array each render
  // and would restart the layout on every frame of state.
  const nodes = useMemo(() => graph?.nodes ?? [], [graph]);
  const edges = useMemo(() => graph?.edges ?? [], [graph]);

  /** id -> [{ id, shared, lift }] */
  const adjacency = useMemo(() => {
    const map = new Map<number, { id: number; shared: number; lift: number }[]>();
    edges.forEach(([a, b, shared, lift]) => {
      if (!map.has(a)) map.set(a, []);
      if (!map.has(b)) map.set(b, []);
      map.get(a)?.push({ id: b, shared, lift });
      map.get(b)?.push({ id: a, shared, lift });
    });
    map.forEach((list) => list.sort((p, q) => q.lift - p.lift));
    return map;
  }, [edges]);

  /** Only the loudest few per kind carry a permanent label; the rest appear on
      focus. Labelling everything turned the canvas into a wall of text. */
  const labelled = useMemo(() => {
    const byKind = new Map<NodeKind, typeof nodes>();
    nodes.forEach((n) => {
      const list = byKind.get(n.k) ?? [];
      list.push(n);
      byKind.set(n.k, list);
    });
    const keep = new Set<number>();
    byKind.forEach((list) => {
      [...list].sort((a, b) => b.w - a.w).slice(0, 5).forEach((n) => keep.add(n.id));
    });
    return keep;
  }, [nodes]);

  const maxByKind = useMemo(() => {
    const max: Record<string, number> = {};
    nodes.forEach((n) => (max[n.k] = Math.max(max[n.k] ?? 1, n.w)));
    return max;
  }, [nodes]);

  // --- layout -------------------------------------------------------------
  useEffect(() => {
    if (nodes.length === 0) return;
    const bs: Body[] = nodes.map((n, i) => {
      // start on a spiral so the first tick has no degenerate zero distances
      const a = i * 2.399963;
      const rad = 16 * Math.sqrt(i + 1);
      return {
        x: Math.cos(a) * rad,
        y: Math.sin(a) * rad,
        vx: 0,
        vy: 0,
        r: 3.5 + 15 * Math.sqrt(n.w / (maxByKind[n.k] || 1)),
      };
    });
    bodies.current = bs;
    for (let i = 0; i < 220; i += 1) step(bs, edges, 1 - i / 260);
    view.current = { k: 1, x: 0, y: 0 };
  }, [nodes, edges, maxByKind]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, size: { w: number; h: number }) => {
      const bs = bodies.current;
      if (bs.length === 0) return;
      if (!reduced) step(bs, edges, 0.06);

      const v = view.current;
      const cx = size.w / 2 + v.x;
      const cy = size.h / 2 + v.y;
      const sx = (i: number) => cx + bs[i].x * v.k;
      const sy = (i: number) => cy + bs[i].y * v.k;

      const focus = hover ?? (selection?.kind === 'node' ? selection.node.id : null);
      const near = new Set<number>();
      if (focus !== null) {
        near.add(focus);
        adjacency.get(focus)?.forEach((e) => near.add(e.id));
      }

      const visible = (id: number) => on[nodes[id].k];

      // edges
      ctx.lineCap = 'round';
      for (let i = 0; i < edges.length; i += 1) {
        const [a, b, , lift] = edges[i];
        if (!visible(a) || !visible(b)) continue;
        const lit = focus !== null && (a === focus || b === focus);
        if (focus !== null && !lit) {
          ctx.strokeStyle = 'rgba(120,100,145,0.05)';
          ctx.lineWidth = 0.6;
        } else {
          const alpha = Math.min(0.5, 0.06 + (lift - 1) * 0.16);
          ctx.strokeStyle = lit ? 'rgba(255,255,255,0.55)' : `rgba(170,140,200,${alpha})`;
          ctx.lineWidth = lit ? 1.4 : 0.75;
        }
        ctx.beginPath();
        ctx.moveTo(sx(a), sy(a));
        ctx.lineTo(sx(b), sy(b));
        ctx.stroke();
      }

      // nodes, small first so the big ones sit on top
      const order = nodes.map((_, i) => i).sort((p, q) => bs[p].r - bs[q].r);
      for (const i of order) {
        const n = nodes[i];
        const dim = !visible(i) || (focus !== null && !near.has(i));
        const r = bs[i].r * Math.max(0.45, Math.min(v.k, 2));
        const ink = KIND[n.k].ink;

        ctx.globalAlpha = dim ? 0.13 : 1;
        if (!dim && (r > 9 || near.has(i))) {
          ctx.shadowColor = ink;
          ctx.shadowBlur = near.has(i) ? 24 : 12;
        }
        ctx.beginPath();
        ctx.arc(sx(i), sy(i), r, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (i === focus) {
          ctx.beginPath();
          ctx.arc(sx(i), sy(i), r + 7, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // labels: the standing few, plus whatever is in focus, and never stacked
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const taken: [number, number, number, number][] = [];
      const order2 = nodes.map((_, i) => i).sort((p, q) => bs[q].r - bs[p].r);
      for (const i of order2) {
        if (!visible(i)) continue;
        if (focus !== null ? !near.has(i) : !labelled.has(nodes[i].id)) continue;
        const x = sx(i);
        const y = sy(i) - bs[i].r * Math.min(v.k, 2) - 6;
        if (x < -80 || x > size.w + 80 || y < 0 || y > size.h) continue;
        const text = nodes[i].l;
        const wpx = ctx.measureText(text).width;
        const box: [number, number, number, number] = [x - wpx / 2 - 4, y - 13, wpx + 8, 15];
        const clash = taken.some(
          (t) =>
            box[0] < t[0] + t[2] && box[0] + box[2] > t[0] && box[1] < t[1] + t[3] && box[1] + box[3] > t[1],
        );
        if (clash && i !== focus) continue;
        taken.push(box);
        ctx.fillStyle = 'rgba(18,12,24,0.78)';
        ctx.fillRect(box[0], box[1], box[2], box[3]);
        ctx.fillStyle = i === focus ? '#fff' : 'rgba(236,227,244,0.82)';
        ctx.fillText(text, x, y);
      }
    },
    [nodes, edges, adjacency, on, hover, selection, reduced, labelled],
  );

  const [canvasRef, wrapRef, size] = useCanvas(draw, true);

  // --- interaction --------------------------------------------------------
  const hit = useCallback(
    (mx: number, my: number): number => {
      const bs = bodies.current;
      const v = view.current;
      const cx = size.w / 2 + v.x;
      const cy = size.h / 2 + v.y;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < bs.length; i += 1) {
        if (!on[nodes[i].k]) continue;
        const dx = cx + bs[i].x * v.k - mx;
        const dy = cy + bs[i].y * v.k - my;
        const d = Math.hypot(dx, dy);
        const r = Math.max(13, bs[i].r * Math.min(v.k, 2));
        if (d < r && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    [nodes, on, size],
  );

  const select = useCallback(
    (id: number) => {
      const node = nodes[id];
      if (!node) return;
      const neighbours = (adjacency.get(id) ?? [])
        .slice(0, 12)
        .map((e) => ({ node: nodes[e.id], shared: e.shared, lift: e.lift }));
      onSelect({ kind: 'node', node, neighbours });
    },
    [nodes, adjacency, onSelect],
  );

  const local = (e: React.PointerEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current.mode = 'none';
      return;
    }
    const id = hit(p.x, p.y);
    drag.current = { mode: id >= 0 ? 'node' : 'pan', id, moved: 0 };
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = local(e);
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current > 0) zoomAt(view.current, (a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.current, size);
      pinch.current = d;
      return;
    }

    const d = drag.current;
    if (d.mode === 'none') {
      const id = hit(p.x, p.y);
      setHover(id >= 0 ? id : null);
      return;
    }
    if (!prev) return;
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.mode === 'pan') {
      view.current.x += dx;
      view.current.y += dy;
    } else if (d.id >= 0) {
      const body = bodies.current[d.id];
      body.x += dx / view.current.k;
      body.y += dy / view.current.k;
      body.vx = 0;
      body.vy = 0;
    }
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d.mode === 'node' && d.id >= 0 && d.moved < 6) select(d.id);
    else if (d.mode === 'pan' && d.moved < 6) onSelect(null);
    drag.current = { mode: 'none', id: -1, moved: 0 };
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = 0;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    zoomAt(view.current, e.clientX - box.left, e.clientY - box.top, Math.exp(-e.deltaY * 0.0015), size);
  };

  const nudge = (f: number) => zoomAt(view.current, size.w / 2, size.h / 2, f, size);

  if (!graph) {
    return (
      <article className="act act--pad">
        <p className="loading" role="status">
          Weaving the connections…
        </p>
      </article>
    );
  }

  const counts = KINDS.map((k) => ({ k, n: nodes.filter((n) => n.k === k).length }));

  return (
    <article className="act act--full">
      <header className="act__head">
        <h2 className="h-act">
          <span className="h-act__n">02</span> Things that keep happening together
        </h2>
        <p className="h-act__sub">
          {num(nodes.length)} recurring things, {num(edges.length)} ties. A line means two of
          them shared a day far more often than chance would allow. Drag to move, scroll to
          zoom, tap anything to open it.
        </p>
      </header>

      <div className="chips" role="group" aria-label="Filter by kind">
        {counts.map(({ k, n }) => (
          <button
            key={k}
            className={`chip${on[k] ? ' is-on' : ''}`}
            style={{ '--ink': KIND[k].ink } as React.CSSProperties}
            aria-pressed={on[k]}
            onClick={() => setOn((s) => ({ ...s, [k]: !s[k] }))}
          >
            <i aria-hidden="true" />
            {KIND[k].label} <b>{n}</b>
          </button>
        ))}
        <span className="chips__spacer" />
        <button className="chip chip--ghost" onClick={() => nudge(1.25)} aria-label="Zoom in">
          +
        </button>
        <button className="chip chip--ghost" onClick={() => nudge(0.8)} aria-label="Zoom out">
          −
        </button>
      </div>

      <div
        className="canvasWrap"
        ref={wrapRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        style={{ cursor: hover !== null ? 'pointer' : 'grab' }}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>

      {/* Keyboard and screen-reader route into the same selection state. */}
      <details className="a11yList">
        <summary>Open the same {nodes.length} things as a list</summary>
        <ul>
          {[...nodes]
            .sort((a, b) => b.w - a.w)
            .map((n) => (
              <li key={n.id}>
                <button onClick={() => select(n.id)}>
                  <span style={{ color: KIND[n.k].ink }}>{n.l}</span>
                  <span className="a11yList__meta">
                    {num(n.w)} {KIND[n.k].unit} · {adjacency.get(n.id)?.length ?? 0} ties
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </details>
    </article>
  );
}

/** One tick of a plain spring/repulsion layout. */
function step(bs: Body[], edges: [number, number, number, number][], heat: number) {
  const n = bs.length;
  const k = Math.max(0.02, heat);

  for (let i = 0; i < n; i += 1) {
    const a = bs[i];
    for (let j = i + 1; j < n; j += 1) {
      const b = bs[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) {
        dx = (Math.random() - 0.5) * 0.4;
        dy = (Math.random() - 0.5) * 0.4;
        d2 = 0.2;
      }
      const min = (a.r + b.r + 10) ** 2;
      const force = (2600 + (d2 < min ? 9000 : 0)) / d2;
      const inv = 1 / Math.sqrt(d2);
      const fx = dx * inv * force * k;
      const fy = dy * inv * force * k;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  for (let e = 0; e < edges.length; e += 1) {
    const [i, j, , lift] = edges[e];
    const a = bs[i];
    const b = bs[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.01;
    const rest = 210 - Math.min(120, lift * 26);
    const f = ((d - rest) * 0.012 * k) / d;
    a.vx += dx * f;
    a.vy += dy * f;
    b.vx -= dx * f;
    b.vy -= dy * f;
  }

  for (let i = 0; i < n; i += 1) {
    const a = bs[i];
    a.vx -= a.x * 0.0022 * k;
    a.vy -= a.y * 0.0022 * k;
    a.vx *= 0.86;
    a.vy *= 0.86;
    a.x += Math.max(-14, Math.min(14, a.vx));
    a.y += Math.max(-14, Math.min(14, a.vy));
  }
}

function zoomAt(
  v: { k: number; x: number; y: number },
  mx: number,
  my: number,
  factor: number,
  size: { w: number; h: number },
) {
  const next = Math.max(0.28, Math.min(4.5, v.k * factor));
  const wx = (mx - size.w / 2 - v.x) / v.k;
  const wy = (my - size.h / 2 - v.y) / v.k;
  v.x = mx - size.w / 2 - wx * next;
  v.y = my - size.h / 2 - wy * next;
  v.k = next;
}
