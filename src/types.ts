/**
 * Shapes of the JSON bundles in /public/data, produced by etl/build_data.py.
 *
 * The bundles are deliberately terse — rows are tuples and strings are
 * dictionary-encoded — because the whole record has to travel to the browser
 * with no server to page it. Everything here is the decoder ring.
 */

/** Which of the three source records a moment came from. */
export const STREAM = { music: 0, ledger: 1, card: 2 } as const;
export type StreamId = (typeof STREAM)[keyof typeof STREAM];

/** core.json — small enough to block first render on. */
export interface Core {
  meta: Meta;
  eras: Era[];
  clock: ClockHour[];
  weekday: Weekday[];
  /** [ "YYYY-MM", plays, musicMinutes, ledgerSpend, cardSpend, ghostSpend ] */
  months: [string, number, number, number, number, number][];
  findings: Finding[];
  ghost: Ghost;
  topTracks: [string, number][];
  topArtists: Artist[];
}

/** Headline counts for the whole record, computed once by the pipeline. */
export interface Meta {
  built: string;
  from: string;
  to: string;
  spanDays: number;
  plays: number;
  minutes: number;
  artists: number;
  tracks: number;
  ledgerRows: number;
  ledgerSpend: number;
  cardRows: number;
  cardSpend: number;
  activeDays: number;
  receipts: number;
  devices: [string, number][];
}

/** A named stretch of the decade, with the statistics that define it. */
export interface Era {
  id: number;
  name: string;
  blurb: string;
  from: string;
  to: string;
  plays: number;
  hours: number;
  artists: number;
  topArtist: string | null;
  topArtistPlays: number;
  topTrack: string | null;
  spend: number;
  txns: number;
  ghost: number;
  skipRate: number | null;
  device: string | null;
  nightShare: number | null;
}

/** One of the twenty-four buckets behind the rhythm dial. */
export interface ClockHour {
  h: number;
  plays: number;
  mins: number;
  spend: number;
  skip: number | null;
}

/** Listening and spending totals for one day of the week. */
export interface Weekday {
  d: string;
  plays: number;
  mins: number;
  spend: number;
}

/** A headline claim, with the number that backs it. */
export interface Finding {
  k: string;
  n: string;
  u: string;
  t: string;
  d: string;
}

/** A band with its own lifespan, used by the constellation. */
export interface Artist {
  name: string;
  plays: number;
  mins: number;
  first: string;
  last: string;
  peakYear: number;
  skip: number | null;
  night: number | null;
  track: string;
  tracks: number;
}

/** The disputed half of the card trail, and every measurement of it. */
export interface Ghost {
  count: number;
  clean: number;
  total: number;
  amt: number;
  cleanAmt: number;
  share: number;
  first: string;
  last: string;
  cities: number;
  states: number;
  merchants: number;
  hour: number[];
  cleanHour: number[];
  byCat: { k: string; ghost: number; clean: number }[];
  byMonth: [string, number][];
  topCities: [string, number, number][];
  biggest: [string, string, number, string][];
  gapDays: number;
  /** Pearson correlation between the two normalised hourly shapes. */
  hourCorr: number;
  /** Largest share any single hour takes of the disputed charges. */
  flatShare: number;
  townsAll: number;
  townsFull: number;
  townsNone: number;
  catSpread: { k: string; share: number }[];
}

/** days.json — one row per calendar day across the whole span. */
export interface DaysBundle {
  artists: string[];
  /** [date, plays, minutes, nightPlays, ledgerN, ledgerAmt, cardN, cardAmt, ghostN, topArtistIdx] */
  d: [string, number, number, number, number, number, number, number, number, number][];
}

/** One calendar day, decoded from the compact tuple form. */
export interface DayRow {
  date: string;
  plays: number;
  minutes: number;
  night: number;
  ledgerN: number;
  ledgerAmt: number;
  cardN: number;
  cardAmt: number;
  ghostN: number;
  topArtist: string | null;
}

/** graph.json — the constellation. */
export type NodeKind = 'artist' | 'ledger' | 'place' | 'spend';

export interface GraphNode {
  id: number;
  /** label */
  l: string;
  /** kind */
  k: NodeKind;
  /** weight (plays, entries or swipes, depending on kind) */
  w: number;
  /** sub-label */
  t?: string;
  /** detail line */
  d?: string;
}

/** The constellation: nodes plus their lift-scored ties. */
export interface GraphBundle {
  nodes: GraphNode[];
  /** [a, b, sharedDays, lift] */
  edges: [number, number, number, number][];
}

/** moments.json — the individual receipts, dictionary-encoded. */
export interface MomentsBundle {
  /** string table */
  s: string[];
  /** [stream, dayIdx, hour, titleId, subId, value, flag, metaId] */
  m: [number, number, number, number, number, number, number, number][];
}

/** One itemised receipt, decoded. */
export interface Moment {
  stream: StreamId;
  dayIdx: number;
  date: string;
  hour: number;
  title: string;
  sub: string;
  value: number;
  flag: number;
  meta: string;
}

/** atlas.json — the card trail on the map. */
export interface AtlasBundle {
  /** [city, lat, lon, swipes, disputed, amount, state, topCategory] */
  c: [string, number, number, number, number, number, string, string][];
}

/** One town on the card trail, decoded. */
export interface City {
  name: string;
  lat: number;
  lon: number;
  swipes: number;
  disputed: number;
  amount: number;
  state: string;
  topCategory: string;
}

/** What the inspector drawer can be asked to show. */
export type Selection =
  | { kind: 'node'; node: GraphNode; neighbours: { node: GraphNode; shared: number; lift: number }[] }
  | { kind: 'city'; city: City }
  | { kind: 'era'; era: Era }
  | { kind: 'month'; month: string; plays: number; minutes: number; ledger: number; card: number; ghost: number }
  | null;
