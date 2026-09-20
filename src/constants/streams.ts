/**
 * The three records, and the one ink each of them is drawn in.
 *
 * Colour carries meaning everywhere in this interface, so the mapping lives in
 * exactly one place: pink is always a song, amber is always the household
 * ledger, mint is always a place, violet is always a charge nobody can
 * account for.
 */
export const STREAM = { music: 0, ledger: 1, card: 2 } as const;

export type StreamId = (typeof STREAM)[keyof typeof STREAM];

/** One colour per meaning, defined in exactly one place. */
export const INK = {
  music: '#ff5c8a',
  ledger: '#ffb13c',
  place: '#4fe3c1',
  ghost: '#9a7bff',
} as const;

/** Device ids stored against each music receipt, in pipeline order. */
export const PLATFORM = [
  '',
  'android',
  'iOS',
  'windows',
  'mac',
  'web player',
  'cast to device',
] as const;

/** Ledger flow markers, printed in the receipt's left gutter. */
export const FLOW = ['ex', 'in', 'mv'] as const;
