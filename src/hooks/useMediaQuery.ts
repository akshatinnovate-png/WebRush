import { useEffect, useState } from 'react';

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
