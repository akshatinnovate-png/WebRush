import { useCallback, useEffect, useRef, useState } from 'react';
import type { FromWorker, ToWorker, WorkerMoment } from '../workers/record.worker';
import type { Moment, StreamId } from '../types';

/**
 * Thin, promise-shaped client for the record worker.
 *
 * Requests are correlated by an incrementing id, so an answer that arrives
 * after the visitor has already typed another letter is discarded rather than
 * flashing stale results.
 */
export function useRecordWorker(dates: string[] | null) {
  const worker = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, (rows: Moment[]) => void>());
  const nextId = useRef(1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!dates || dates.length === 0) return;
    const w = new Worker(new URL('../workers/record.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = w;
    // Captured for cleanup: the ref may point elsewhere by the time this runs.
    const inflight = pending.current;

    w.addEventListener('message', (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      if (msg.type === 'ready') setCount(msg.count);
      else if (msg.type === 'results') {
        pending.current.get(msg.id)?.(msg.rows as unknown as Moment[]);
        pending.current.delete(msg.id);
      } else if (msg.type === 'failed') {
        console.error('record worker failed', msg.message);
      }
    });

    const load: ToWorker = {
      type: 'load',
      url: `${import.meta.env.BASE_URL}data/moments.json`,
      dates,
    };
    w.postMessage(load);

    return () => {
      w.terminate();
      worker.current = null;
      inflight.clear();
    };
  }, [dates]);

  const ask = useCallback((msg: Omit<ToWorker & { id: number }, 'id'>): Promise<Moment[]> => {
    const w = worker.current;
    if (!w) return Promise.resolve([]);
    const id = nextId.current++;
    return new Promise((resolve) => {
      pending.current.set(id, resolve);
      w.postMessage({ ...msg, id } as ToWorker);
    });
  }, []);

  const search = useCallback(
    (term: string, limit = 60) => ask({ type: 'search', term, limit } as never),
    [ask],
  );
  const day = useCallback((date: string) => ask({ type: 'day', date } as never), [ask]);

  return { ready: count > 0, count, search, day };
}

export type { WorkerMoment, StreamId };
