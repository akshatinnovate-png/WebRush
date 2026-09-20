/**
 * The seven passes over the record.
 *
 * They are a sequence, not a menu: each pass assumes what the previous one
 * established, which is why the navigation is numbered rather than tabbed.
 * Kept out of the component tree so the router, the rail and the tests can
 * all agree on one definition.
 */
export interface Act {
  /** Stable slug, used for the URL hash and analytics-free routing. */
  readonly id: string;
  /** What the rail shows. */
  readonly label: string;
  /** One-line description under the label. */
  readonly hint: string;
}

/** The eight passes, in the order they are meant to be read. */
export const ACTS = [
  { id: 'overture', label: 'The record', hint: 'what was collected' },
  { id: 'web', label: 'The web', hint: 'what connects to what' },
  { id: 'tape', label: 'The tape', hint: 'eleven years, printed' },
  { id: 'day', label: 'A single day', hint: 'one receipt at a time' },
  { id: 'rhythm', label: 'The rhythm', hint: 'when this life happens' },
  { id: 'atlas', label: 'The trail', hint: 'where the card went' },
  { id: 'thread', label: 'The thread', hint: 'follow one collision' },
  { id: 'copy', label: 'The copy', hint: 'the half that was not theirs' },
] as const satisfies readonly Act[];

/** Stable slug for a pass; also its URL hash. */
export type ActId = (typeof ACTS)[number]['id'];

/** Resolve a URL hash such as `#tape` to its index, defaulting to the opening. */
export function actIndexFromHash(hash: string): number {
  const id = hash.replace(/^#/, '');
  const i = ACTS.findIndex((a) => a.id === id);
  return i < 0 ? 0 : i;
}
