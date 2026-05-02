import { DateTime } from 'luxon';
import type { RecurrenceRule } from './types';

/**
 * Recurrence engine — pure functions, no side effects, no DB.
 *
 * All public APIs operate in the user's IANA `timezone` so that "every Wed
 * at 9am" stays at 9am local across DST transitions. UTC instants returned
 * as JS `Date` for storage.
 *
 * On DST spring-forward gaps (e.g. 02:30 on the skip day), Luxon advances
 * to the equivalent valid instant; on fall-back overlaps it picks the first
 * occurrence. We accept that — a 5-min reminder window absorbs the edge.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function assertValidRule(rule: RecurrenceRule): void {
  switch (rule.type) {
    case 'every_n_days':
      if (!Number.isInteger(rule.n) || rule.n < 1) throw new Error('n must be integer >= 1');
      if (!ISO_DATE.test(rule.anchorDate)) throw new Error('anchorDate must be YYYY-MM-DD');
      return;
    case 'weekdays':
      if (!rule.days.length) throw new Error('weekdays.days cannot be empty');
      if (rule.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
        throw new Error('weekdays.days must be 0..6');
      return;
    case 'month_dates':
      if (!rule.days.length) throw new Error('month_dates.days cannot be empty');
      if (rule.days.some((d) => !Number.isInteger(d) || d < 1 || d > 31))
        throw new Error('month_dates.days must be 1..31');
      return;
    case 'yearly_date':
      if (rule.month < 1 || rule.month > 12) throw new Error('yearly_date.month must be 1..12');
      if (rule.day < 1 || rule.day > 31) throw new Error('yearly_date.day must be 1..31');
      return;
  }
}

function assertHHMM(time: string): void {
  if (!HHMM.test(time)) throw new Error(`reminderTime must be HH:mm, got "${time}"`);
}

function combine(date: DateTime, time: string): DateTime {
  const [h, m] = time.split(':').map(Number);
  return date.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/** Returns true if `cand` (a calendar date in tz) matches the rule. */
function matchesRule(rule: RecurrenceRule, cand: DateTime): boolean {
  switch (rule.type) {
    case 'every_n_days': {
      const anchor = DateTime.fromISO(rule.anchorDate, { zone: cand.zone }).startOf('day');
      const diffDays = Math.round(cand.startOf('day').diff(anchor, 'days').days);
      if (diffDays < 0) return false;
      return diffDays % rule.n === 0;
    }
    case 'weekdays': {
      // Luxon weekday: 1=Mon..7=Sun. Convert to 0=Sun..6=Sat.
      const dow = cand.weekday % 7;
      return rule.days.includes(dow);
    }
    case 'month_dates':
      return rule.days.includes(cand.day);
    case 'yearly_date':
      return cand.month === rule.month && cand.day === rule.day;
  }
}

/**
 * First UTC instant of an occurrence at-or-after `after`.
 * Returns null if no occurrence found within `searchHorizonDays` (default 366*4).
 */
export function nextOccurrence(
  rule: RecurrenceRule,
  reminderTime: string,
  after: Date,
  timezone: string,
  searchHorizonDays = 366 * 4,
): Date | null {
  assertValidRule(rule);
  assertHHMM(reminderTime);

  const cursor0 = DateTime.fromJSDate(after, { zone: timezone });
  if (!cursor0.isValid) throw new Error(`Invalid timezone: ${timezone}`);

  let day = cursor0.startOf('day');
  for (let i = 0; i <= searchHorizonDays; i++) {
    if (matchesRule(rule, day)) {
      const fire = combine(day, reminderTime);
      if (fire.toMillis() >= cursor0.toMillis()) {
        return fire.toUTC().toJSDate();
      }
    }
    day = day.plus({ days: 1 });
  }
  return null;
}

/**
 * All occurrences (UTC instants) with fire time in [start, end).
 * Order: ascending.
 */
export function occurrencesBetween(
  rule: RecurrenceRule,
  reminderTime: string,
  start: Date,
  end: Date,
  timezone: string,
): Date[] {
  assertValidRule(rule);
  assertHHMM(reminderTime);
  if (end <= start) return [];

  const startDt = DateTime.fromJSDate(start, { zone: timezone });
  const endDt = DateTime.fromJSDate(end, { zone: timezone });
  if (!startDt.isValid || !endDt.isValid) throw new Error(`Invalid timezone: ${timezone}`);

  const out: Date[] = [];
  let day = startDt.startOf('day');
  const stop = endDt.endOf('day');

  while (day <= stop) {
    if (matchesRule(rule, day)) {
      const fire = combine(day, reminderTime);
      const ms = fire.toMillis();
      if (ms >= start.getTime() && ms < end.getTime()) {
        out.push(fire.toUTC().toJSDate());
      }
    }
    day = day.plus({ days: 1 });
  }

  return out;
}
