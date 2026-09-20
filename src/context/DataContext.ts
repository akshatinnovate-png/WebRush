import { createContext } from 'react';
import type { City, Core, DayRow, GraphBundle, Moment } from '../types';

/** Everything the record consists of, as it arrives. */
export interface DataState {
  core: Core | null;
  days: DayRow[] | null;
  graph: GraphBundle | null;
  moments: Moment[] | null;
  cities: City[] | null;
  /** 0–1, how much of the record has arrived */
  progress: number;
  error: string | null;
}

/** The record before anything has arrived. */
export const EMPTY: DataState = {
  core: null,
  days: null,
  graph: null,
  moments: null,
  cities: null,
  progress: 0,
  error: null,
};

/** Carries the record to every pass without prop drilling. */
export const DataContext = createContext<DataState>(EMPTY);
