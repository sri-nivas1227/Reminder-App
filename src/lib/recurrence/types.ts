/**
 * Recurrence rules. Discriminated union by `type`.
 * `reminderTime` is wall-clock "HH:mm" in user's `timezone`.
 */

export type EveryNDaysRule = {
  type: 'every_n_days';
  /** Interval in days. Must be >= 1. */
  n: number;
  /** ISO date 'YYYY-MM-DD'. First occurrence anchor. */
  anchorDate: string;
};

export type WeekdaysRule = {
  type: 'weekdays';
  /** 0=Sun .. 6=Sat. Non-empty, deduped. */
  days: number[];
};

export type MonthDatesRule = {
  type: 'month_dates';
  /** 1..31. Days outside the month length are skipped (no shift). */
  days: number[];
};

export type YearlyDateRule = {
  type: 'yearly_date';
  /** 1..12 */
  month: number;
  /** 1..31. Feb 29 → fires only on leap years. */
  day: number;
};

export type RecurrenceRule = EveryNDaysRule | WeekdaysRule | MonthDatesRule | YearlyDateRule;
