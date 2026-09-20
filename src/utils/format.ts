/** Shared formatting. The ledger is in rupees, the music is in minutes. */

// Counts use plain thousands grouping; money uses Indian grouping, because
// every amount in this record is in rupees and ₹1,95,73,90 is how it is written.
const counts = new Intl.NumberFormat('en-US');
const money = new Intl.NumberFormat('en-IN');

/** A count, grouped in thousands. */
export const num = (n: number): string => counts.format(Math.round(n));

/** Seconds, shown the way a receipt would: 43s, 4m. */
export const secs = (v: number): string => (v < 60 ? `${v}s` : `${Math.round(v / 60)}m`);

/** Rupees, abbreviated the Indian way once the numbers get silly. */
export function rupees(n: number, short = false): string {
  if (!short) return `₹${money.format(Math.round(n))}`;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

/** A duration, collapsing to hours once it is long enough. */
export function minutes(m: number): string {
  if (m >= 1440) return `${num(Math.round(m / 60))} h`;
  if (m >= 60) return `${Math.floor(m / 60)} h ${Math.round(m % 60)} m`;
  return `${Math.round(m)} m`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Parsed as local noon so a timezone never shifts a date by a day. */
export const asDate = (iso: string): Date => new Date(`${iso}T12:00:00`);

export function longDate(iso: string): string {
  const d = asDate(iso);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Compact date for dense lists. */
export function shortDate(iso: string): string {
  const d = asDate(iso);
  return `${d.getDate()} ${SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** A YYYY-MM key, rendered for people. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${SHORT[Number(m) - 1]} ${y}`;
}

/** An hour of the day, the way a person would say it. */
export function clockTime(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'am' : 'pm'}`;
}

/** 0–1 → "52.7%" */
export const pct = (v: number, dp = 1): string => `${(v * 100).toFixed(dp)}%`;

/** Deterministic 0–1 hash, used for barcodes and jitter so repeat visits match. */
export function hash01(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Confines a value to a range. */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Linear interpolation between two values. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
