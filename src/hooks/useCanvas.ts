import { useEffect, useRef } from 'react';
import { useSize, type Size } from './useSize';

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
