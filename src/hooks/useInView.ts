import { useEffect, useRef, useState } from 'react';

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
