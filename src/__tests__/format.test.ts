import { describe, expect, it } from 'vitest';
import { clockTime, hash01, longDate, minutes, num, pct, rupees, secs } from '../utils/format';

describe('num', () => {
  it('groups counts in thousands, not lakhs', () => {
    expect(num(153597)).toBe('153,597');
  });
  it('rounds rather than truncating', () => {
    expect(num(1.6)).toBe('2');
  });
});

describe('rupees', () => {
  it('uses Indian grouping for full amounts', () => {
    expect(rupees(6514893)).toBe('₹65,14,893');
  });
  it('abbreviates to lakhs and crores when short', () => {
    expect(rupees(3208742, true)).toBe('₹32.1 L');
    expect(rupees(22515769, true)).toBe('₹2.25 cr');
    expect(rupees(4500, true)).toBe('₹4.5k');
  });
});

describe('secs', () => {
  it('keeps sub-minute plays visible, which is the whole skipping story', () => {
    expect(secs(8)).toBe('8s');
    expect(secs(59)).toBe('59s');
  });
  it('switches to minutes above a minute', () => {
    expect(secs(240)).toBe('4m');
  });
});

describe('minutes', () => {
  it('collapses long spans to hours', () => {
    expect(minutes(1500)).toBe('25 h');
    expect(minutes(90)).toBe('1 h 30 m');
    expect(minutes(12)).toBe('12 m');
  });
});

describe('clockTime', () => {
  it('reads midnight and noon the way a person would', () => {
    expect(clockTime(0)).toBe('12am');
    expect(clockTime(12)).toBe('12pm');
    expect(clockTime(23)).toBe('11pm');
  });
});

describe('longDate', () => {
  it('parses at local noon so no timezone can shift the day', () => {
    expect(longDate('2015-01-12')).toBe('Monday 12 January 2015');
  });
});

describe('pct', () => {
  it('renders a share to one decimal by default', () => {
    expect(pct(0.5024)).toBe('50.2%');
    expect(pct(0.5024, 0)).toBe('50%');
  });
});

describe('hash01', () => {
  it('is deterministic, so a barcode is stable across visits', () => {
    const a = hash01('2017-09-06');
    const b = hash01('2017-09-06');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('differs between seeds', () => {
    expect(hash01('a')()).not.toBe(hash01('b')());
  });
  it('stays inside the unit interval', () => {
    const r = hash01('seed');
    for (let i = 0; i < 200; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
