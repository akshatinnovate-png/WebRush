import { useLayoutEffect, useRef, useState } from 'react';

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
