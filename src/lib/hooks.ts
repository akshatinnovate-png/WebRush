import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** True when the visitor has asked their OS for less movement. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Live boolean for any media query. */
export function useMediaQuery(query: string): boolean {
  const [hit, setHit] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setHit(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return hit;
}

/** An element's size in CSS pixels. */
export interface Size {
  w: number;
  h: number;
}

/** Element size in CSS pixels, tracked with a ResizeObserver. */
export function useSize<T extends HTMLElement>(): [React.RefObject<T>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/**
 * A canvas that is always sized to its parent and scaled for the display's
 * pixel ratio, so nothing drawn on it looks soft on a phone.
 */
export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, size: Size, t: number) => void,
  animate: boolean,
): [React.RefObject<HTMLCanvasElement>, React.RefObject<HTMLDivElement>, Size] {
  const [wrap, size] = useSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const c = canvas.current;
    if (!c || size.w === 0 || size.h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(size.w * dpr);
    c.height = Math.floor(size.h * dpr);
    c.style.width = `${size.w}px`;
    c.style.height = `${size.h}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      drawRef.current(ctx, size, (now - start) / 1000);
      if (animate) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, animate]);

  return [canvas, wrap, size];
}

/** Fires once when the element first scrolls into view. */
export function useInView<T extends HTMLElement>(margin = '0px'): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSeen(true)),
      { rootMargin: margin, threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [ref, seen];
}

/** Counts up to a target once triggered; skipped entirely for reduced motion. */
export function useCountUp(target: number, run: boolean, ms = 1200): number {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? target : 0);
  useEffect(() => {
    if (!run) return;
    if (reduced) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      // ease-out cubic: fast start, gentle landing
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms, reduced]);
  return v;
}

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
