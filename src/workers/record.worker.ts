/// <reference lib="webworker" />

/**
 * The record, off the main thread.
 *
 * `moments.json` is 565 KB of dictionary-encoded tuples that have to be
 * expanded into 13,920 objects. Doing that on the main thread blocks the first
 * interaction for tens of milliseconds on a mid-range phone, and every
 * keystroke in the search palette then scans the whole array.
 *
 * Both jobs live here instead. The worker owns the decoded record, answers
 * queries against it, and the main thread only ever receives the handful of
 * rows it is about to paint. Search stays responsive no matter how fast
 * somebody types.
 */

interface RawBundle {
  s: string[];
  m: [number, number, number, number, number, number, number, number][];
}

/** A decoded receipt as it crosses the worker boundary. */
export interface WorkerMoment {
  stream: number;
  dayIdx: number;
  date: string;
  hour: number;
  title: string;
  sub: string;
  value: number;
  flag: number;
  meta: string;
}

/** Messages the page sends the record worker. */
export type ToWorker =
  | { type: 'load'; url: string; dates: string[] }
  | { type: 'search'; id: number; term: string; limit: number }
  | { type: 'day'; id: number; date: string };

/** Messages the record worker sends back. */
export type FromWorker =
  | { type: 'ready'; count: number }
  | { type: 'failed'; message: string }
  | { type: 'results'; id: number; rows: WorkerMoment[] };

let rows: WorkerMoment[] = [];
/** Pre-lowercased haystack, so a keystroke never re-lowercases 13,920 strings. */
let haystack: string[] = [];
/** date -> [start, end) into `rows`, which are already in chronological order. */
const byDate = new Map<string, [number, number]>();

const post = (msg: FromWorker) => (self as unknown as Worker).postMessage(msg);

function index(): void {
  haystack = rows.map((r) => `${r.title}\n${r.sub}\n${r.meta}\n${r.date}`.toLowerCase());
  byDate.clear();
  for (let i = 0; i < rows.length; i += 1) {
    const span = byDate.get(rows[i].date);
    if (span) span[1] = i + 1;
    else byDate.set(rows[i].date, [i, i + 1]);
  }
}

async function load(url: string, dates: string[]): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`moments.json responded ${res.status}`);
  const raw = (await res.json()) as RawBundle;
  rows = raw.m.map((r) => ({
    stream: r[0],
    dayIdx: r[1],
    date: dates[r[1]] ?? '',
    hour: r[2],
    title: raw.s[r[3]] ?? '',
    sub: raw.s[r[4]] ?? '',
    value: r[5],
    flag: r[6],
    meta: raw.s[r[7]] ?? '',
  }));
  index();
  post({ type: 'ready', count: rows.length });
}

self.addEventListener('message', (event: MessageEvent<ToWorker>) => {
  const msg = event.data;

  if (msg.type === 'load') {
    load(msg.url, msg.dates).catch((e: Error) => post({ type: 'failed', message: e.message }));
    return;
  }

  if (msg.type === 'search') {
    const term = msg.term.trim().toLowerCase();
    const out: WorkerMoment[] = [];
    if (term.length >= 2) {
      for (let i = 0; i < haystack.length && out.length < msg.limit; i += 1) {
        if (haystack[i].includes(term)) out.push(rows[i]);
      }
    }
    post({ type: 'results', id: msg.id, rows: out });
    return;
  }

  if (msg.type === 'day') {
    const span = byDate.get(msg.date);
    const slice = span ? rows.slice(span[0], span[1]) : [];
    post({ type: 'results', id: msg.id, rows: [...slice].sort((a, b) => a.hour - b.hour) });
  }
});
