import { useEffect, useState, type ReactNode } from 'react';
import { DataContext, EMPTY, type DataState } from './DataContext';
import type {
  AtlasBundle,
  City,
  Core,
  DayRow,
  DaysBundle,
  GraphBundle,
  Moment,
  MomentsBundle,
  StreamId,
} from '../types';

/**
 * There is no backend, so the whole record is four static JSON files.
 * core.json is tiny and gates the first render; the three heavy bundles arrive
 * afterwards and each act reveals itself as its data lands. That keeps first
 * paint fast without hiding the interface behind one long spinner.
 */


async function get<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`${file} responded ${res.status}`);
  return (await res.json()) as T;
}

/** Fetches and decodes the record, then shares it by context. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(EMPTY);

  useEffect(() => {
    let live = true;
    const bump = (patch: Partial<DataState>, weight: number) =>
      setState((s) =>
        live ? { ...s, ...patch, progress: Math.min(1, s.progress + weight) } : s,
      );

    get<Core>('core.json')
      .then((core) => {
        bump({ core }, 0.25);

        get<DaysBundle>('days.json')
          .then((raw) => {
            const days: DayRow[] = raw.d.map((r) => ({
              date: r[0],
              plays: r[1],
              minutes: r[2],
              night: r[3],
              ledgerN: r[4],
              ledgerAmt: r[5],
              cardN: r[6],
              cardAmt: r[7],
              ghostN: r[8],
              topArtist: r[9] >= 0 ? (raw.artists[r[9]] ?? null) : null,
            }));
            bump({ days }, 0.25);

            // moments reference days by index, so they are decoded after days
            get<MomentsBundle>('moments.json')
              .then((mb) => {
                const moments: Moment[] = mb.m.map((r) => ({
                  stream: r[0] as StreamId,
                  dayIdx: r[1],
                  date: days[r[1]]?.date ?? '',
                  hour: r[2],
                  title: mb.s[r[3]] ?? '',
                  sub: mb.s[r[4]] ?? '',
                  value: r[5],
                  flag: r[6],
                  meta: mb.s[r[7]] ?? '',
                }));
                bump({ moments }, 0.25);
              })
              .catch((e: Error) => bump({ error: e.message }, 0.25));
          })
          .catch((e: Error) => bump({ error: e.message }, 0.5));

        get<GraphBundle>('graph.json')
          .then((graph) => bump({ graph }, 0.15))
          .catch((e: Error) => bump({ error: e.message }, 0.15));

        get<AtlasBundle>('atlas.json')
          .then((raw) => {
            const cities: City[] = raw.c.map((r) => ({
              name: r[0],
              lat: r[1],
              lon: r[2],
              swipes: r[3],
              disputed: r[4],
              amount: r[5],
              state: r[6],
              topCategory: r[7],
            }));
            bump({ cities }, 0.1);
          })
          .catch((e: Error) => bump({ error: e.message }, 0.1));
      })
      .catch((e: Error) => setState((s) => ({ ...s, error: e.message, progress: 1 })));

    return () => {
      live = false;
    };
  }, []);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}
