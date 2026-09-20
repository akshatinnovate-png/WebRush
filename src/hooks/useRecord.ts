import { useContext, useMemo } from 'react';
import { DataContext, type DataState } from '../context/DataContext';
import type { DayRow, Moment } from '../types';

/** The record as it currently stands. */
export function useData(): DataState {
  return useContext(DataContext);
}

/** Every moment that happened on one calendar day, in clock order. */
export function useDay(date: string | null): Moment[] {
  const { moments } = useData();
  return useMemo(() => {
    if (!moments || !date) return [];
    return moments.filter((m) => m.date === date).sort((a, b) => a.hour - b.hour);
  }, [moments, date]);
}

/** Day rows keyed by date, for quick lookups from the tape and the printer. */
export function useDayIndex(): Map<string, DayRow> {
  const { days } = useData();
  return useMemo(() => {
    const map = new Map<string, DayRow>();
    days?.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);
}
