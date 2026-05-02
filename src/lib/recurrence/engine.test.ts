import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { nextOccurrence, occurrencesBetween } from './engine';
import type { RecurrenceRule } from './types';

const TZ = 'America/Los_Angeles';

/** Build a UTC Date from a wall-clock time in TZ. */
function wallToUtc(iso: string, zone = TZ): Date {
  return DateTime.fromISO(iso, { zone }).toUTC().toJSDate();
}

/** Format UTC Date back into wall-clock ISO in TZ. */
function utcToWall(d: Date, zone = TZ): string {
  return DateTime.fromJSDate(d, { zone }).toISO({ suppressMilliseconds: true })!;
}

describe('every_n_days', () => {
  const rule: RecurrenceRule = {
    type: 'every_n_days',
    n: 4,
    anchorDate: '2026-01-01',
  };

  it('next on anchor date when querying before reminder time', () => {
    const next = nextOccurrence(rule, '09:00', wallToUtc('2026-01-01T08:00'), TZ);
    expect(utcToWall(next!)).toBe('2026-01-01T09:00:00-08:00');
  });

  it('skips current day after reminder time, jumps to next interval', () => {
    const next = nextOccurrence(rule, '09:00', wallToUtc('2026-01-01T10:00'), TZ);
    expect(utcToWall(next!)).toBe('2026-01-05T09:00:00-08:00');
  });

  it('returns null before anchor', () => {
    const next = nextOccurrence(rule, '09:00', wallToUtc('2025-12-30T00:00'), TZ, 1);
    expect(next).toBeNull();
  });

  it('lists 8 occurrences in 30-day window', () => {
    const list = occurrencesBetween(
      rule,
      '09:00',
      wallToUtc('2026-01-01T00:00'),
      wallToUtc('2026-02-01T00:00'),
      TZ,
    );
    expect(list).toHaveLength(8); // Jan 1, 5, 9, 13, 17, 21, 25, 29
    expect(utcToWall(list[0])).toBe('2026-01-01T09:00:00-08:00');
    expect(utcToWall(list[7])).toBe('2026-01-29T09:00:00-08:00');
  });
});

describe('weekdays', () => {
  // Mon (1) + Wed (3)
  const rule: RecurrenceRule = { type: 'weekdays', days: [1, 3] };

  it('finds next Monday when querying on Sunday', () => {
    // 2026-01-04 is a Sunday
    const next = nextOccurrence(rule, '07:30', wallToUtc('2026-01-04T12:00'), TZ);
    expect(utcToWall(next!)).toBe('2026-01-05T07:30:00-08:00');
  });

  it('finds same day if it matches and time not passed', () => {
    // 2026-01-07 is a Wednesday
    const next = nextOccurrence(rule, '07:30', wallToUtc('2026-01-07T06:00'), TZ);
    expect(utcToWall(next!)).toBe('2026-01-07T07:30:00-08:00');
  });

  it('lists Mon+Wed in a week', () => {
    const list = occurrencesBetween(
      rule,
      '07:30',
      wallToUtc('2026-01-05T00:00'),
      wallToUtc('2026-01-12T00:00'),
      TZ,
    );
    expect(list).toHaveLength(2);
  });
});

describe('month_dates', () => {
  const rule: RecurrenceRule = { type: 'month_dates', days: [1, 15, 31] };

  it('skips 31 in 30-day months (Apr)', () => {
    const list = occurrencesBetween(
      rule,
      '08:00',
      wallToUtc('2026-04-01T00:00'),
      wallToUtc('2026-05-01T00:00'),
      TZ,
    );
    // Apr 1 + Apr 15 only (no Apr 31)
    expect(list).toHaveLength(2);
  });

  it('includes 31 in 31-day months (May)', () => {
    const list = occurrencesBetween(
      rule,
      '08:00',
      wallToUtc('2026-05-01T00:00'),
      wallToUtc('2026-06-01T00:00'),
      TZ,
    );
    expect(list).toHaveLength(3);
  });

  it('skips Feb 31 entirely', () => {
    const list = occurrencesBetween(
      rule,
      '08:00',
      wallToUtc('2026-02-01T00:00'),
      wallToUtc('2026-03-01T00:00'),
      TZ,
    );
    // Feb 1, 15
    expect(list).toHaveLength(2);
  });
});

describe('yearly_date', () => {
  it('Dec 20 fires once a year', () => {
    const rule: RecurrenceRule = { type: 'yearly_date', month: 12, day: 20 };
    const list = occurrencesBetween(
      rule,
      '09:00',
      wallToUtc('2026-01-01T00:00'),
      wallToUtc('2028-01-01T00:00'),
      TZ,
    );
    expect(list).toHaveLength(2);
    expect(utcToWall(list[0])).toBe('2026-12-20T09:00:00-08:00');
    expect(utcToWall(list[1])).toBe('2027-12-20T09:00:00-08:00');
  });

  it('Feb 29 fires only in leap years', () => {
    const rule: RecurrenceRule = { type: 'yearly_date', month: 2, day: 29 };
    const list = occurrencesBetween(
      rule,
      '09:00',
      wallToUtc('2026-01-01T00:00'),
      wallToUtc('2030-01-01T00:00'),
      TZ,
    );
    // Leap years in window: 2028
    expect(list).toHaveLength(1);
    expect(utcToWall(list[0])).toBe('2028-02-29T09:00:00-08:00');
  });
});

describe('DST', () => {
  // 2026 US DST: spring forward Mar 8 02:00→03:00. Fall back Nov 1 02:00→01:00.

  it('keeps wall-clock 09:00 across spring forward', () => {
    const rule: RecurrenceRule = { type: 'every_n_days', n: 1, anchorDate: '2026-03-07' };
    const list = occurrencesBetween(
      rule,
      '09:00',
      wallToUtc('2026-03-07T00:00'),
      wallToUtc('2026-03-10T00:00'),
      TZ,
    );
    expect(list).toHaveLength(3);
    // Mar 7 PST (-08), Mar 8/9 PDT (-07)
    expect(utcToWall(list[0])).toBe('2026-03-07T09:00:00-08:00');
    expect(utcToWall(list[1])).toBe('2026-03-08T09:00:00-07:00');
    expect(utcToWall(list[2])).toBe('2026-03-09T09:00:00-07:00');
  });

  it('keeps wall-clock 09:00 across fall back', () => {
    const rule: RecurrenceRule = { type: 'every_n_days', n: 1, anchorDate: '2026-10-31' };
    const list = occurrencesBetween(
      rule,
      '09:00',
      wallToUtc('2026-10-31T00:00'),
      wallToUtc('2026-11-03T00:00'),
      TZ,
    );
    expect(list).toHaveLength(3);
    expect(utcToWall(list[0])).toBe('2026-10-31T09:00:00-07:00');
    expect(utcToWall(list[1])).toBe('2026-11-01T09:00:00-08:00');
    expect(utcToWall(list[2])).toBe('2026-11-02T09:00:00-08:00');
  });
});

describe('validation', () => {
  it('rejects n<1', () => {
    expect(() =>
      nextOccurrence(
        { type: 'every_n_days', n: 0, anchorDate: '2026-01-01' },
        '09:00',
        new Date(),
        TZ,
      ),
    ).toThrow();
  });

  it('rejects bad reminderTime', () => {
    expect(() =>
      nextOccurrence({ type: 'weekdays', days: [1] }, '9:00', new Date(), TZ),
    ).toThrow();
  });

  it('rejects empty weekdays', () => {
    expect(() => nextOccurrence({ type: 'weekdays', days: [] }, '09:00', new Date(), TZ)).toThrow();
  });

  it('rejects bad timezone', () => {
    expect(() =>
      nextOccurrence({ type: 'weekdays', days: [1] }, '09:00', new Date(), 'Mars/Olympus'),
    ).toThrow();
  });
});

describe('occurrencesBetween edge cases', () => {
  it('end before start returns empty', () => {
    const list = occurrencesBetween(
      { type: 'weekdays', days: [1] },
      '09:00',
      wallToUtc('2026-01-10T00:00'),
      wallToUtc('2026-01-01T00:00'),
      TZ,
    );
    expect(list).toEqual([]);
  });

  it('half-open: end-instant excluded', () => {
    const list = occurrencesBetween(
      { type: 'every_n_days', n: 1, anchorDate: '2026-01-01' },
      '09:00',
      wallToUtc('2026-01-01T09:00'),
      wallToUtc('2026-01-02T09:00'),
      TZ,
    );
    expect(list).toHaveLength(1);
    expect(utcToWall(list[0])).toBe('2026-01-01T09:00:00-08:00');
  });
});
