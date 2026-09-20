import { describe, expect, it } from 'vitest';
import { ACTS, actIndexFromHash } from '../constants/acts';
import { FLOW, INK, PLATFORM, STREAM } from '../constants/streams';

describe('ACTS', () => {
  it('describes seven passes in reading order', () => {
    expect(ACTS).toHaveLength(8);
    expect(ACTS[0].id).toBe('overture');
    expect(ACTS[7].id).toBe('copy');
  });

  it('has unique ids, because they are the URL', () => {
    expect(new Set(ACTS.map((a) => a.id)).size).toBe(ACTS.length);
  });

  it('gives every pass a label and a hint for the rail', () => {
    ACTS.forEach((a) => {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.hint.length).toBeGreaterThan(0);
    });
  });
});

describe('actIndexFromHash', () => {
  it('resolves a known hash', () => {
    expect(actIndexFromHash('#tape')).toBe(2);
    expect(actIndexFromHash('atlas')).toBe(5);
  });
  it('falls back to the opening for anything unknown', () => {
    expect(actIndexFromHash('#nonsense')).toBe(0);
    expect(actIndexFromHash('')).toBe(0);
  });
});

describe('stream constants', () => {
  it('keeps the pipeline ordering', () => {
    expect(STREAM).toEqual({ music: 0, ledger: 1, card: 2 });
  });
  it('assigns one ink per meaning', () => {
    expect(new Set(Object.values(INK)).size).toBe(4);
  });
  it('indexes platforms so 0 is "unknown"', () => {
    expect(PLATFORM[0]).toBe('');
    expect(PLATFORM[1]).toBe('android');
  });
  it('marks ledger flow with two-letter gutter codes', () => {
    expect(FLOW).toEqual(['ex', 'in', 'mv']);
  });
});

describe('the thread pass', () => {
  it('sits between the map and the reveal, so the reveal stays last', () => {
    expect(ACTS.map((a) => a.id)).toEqual([
      'overture',
      'web',
      'tape',
      'day',
      'rhythm',
      'atlas',
      'thread',
      'copy',
    ]);
  });
});
