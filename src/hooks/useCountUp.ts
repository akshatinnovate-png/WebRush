import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

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
