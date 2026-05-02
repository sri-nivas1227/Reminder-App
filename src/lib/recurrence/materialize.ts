import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { task, taskOccurrence, user } from '../db/schema';
import { occurrencesBetween } from './engine';
import type { RecurrenceRule } from './types';

export const DEFAULT_HORIZON_DAYS = 30;

export interface MaterializeStats {
  tasksProcessed: number;
  occurrencesInserted: number;
}

/**
 * Generate occurrence rows for `windowStart` → `windowEnd` for one task.
 * Idempotent: relies on `(task_id, scheduled_for)` unique index + ON CONFLICT.
 */
export async function materializeTask(
  taskId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<number> {
  const row = await db.query.task.findFirst({
    where: eq(task.id, taskId),
    with: { user: true },
  });
  if (!row || !row.isActive) return 0;

  const tz = row.user.timezone;
  const rule = row.recurrenceConfig as unknown as RecurrenceRule;
  const dates = occurrencesBetween(rule, row.reminderTime, windowStart, windowEnd, tz);
  if (!dates.length) return 0;

  const rows = dates.map((d) => ({ taskId: row.id, scheduledFor: d }));
  const inserted = await db.insert(taskOccurrence).values(rows).onConflictDoNothing().returning({
    id: taskOccurrence.id,
  });
  return inserted.length;
}

/**
 * Materialize occurrences for every active task. Run on schedule (e.g. daily).
 */
export async function materializeAll(
  windowStart: Date = new Date(),
  windowEnd: Date = new Date(Date.now() + DEFAULT_HORIZON_DAYS * 24 * 60 * 60 * 1000),
): Promise<MaterializeStats> {
  const tasks = await db.query.task.findMany({
    where: eq(task.isActive, true),
    with: { user: true },
  });

  let occurrencesInserted = 0;
  for (const t of tasks) {
    const tz = t.user.timezone;
    const rule = t.recurrenceConfig as unknown as RecurrenceRule;
    const dates = occurrencesBetween(rule, t.reminderTime, windowStart, windowEnd, tz);
    if (!dates.length) continue;
    const rows = dates.map((d) => ({ taskId: t.id, scheduledFor: d }));
    const inserted = await db
      .insert(taskOccurrence)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: taskOccurrence.id });
    occurrencesInserted += inserted.length;
  }

  return { tasksProcessed: tasks.length, occurrencesInserted };
}

/**
 * Fetch pending occurrences in a fire window. Used by reminder dispatcher.
 */
export async function pendingOccurrencesIn(start: Date, end: Date) {
  return db.query.taskOccurrence.findMany({
    where: and(
      gte(taskOccurrence.scheduledFor, start),
      lt(taskOccurrence.scheduledFor, end),
      eq(taskOccurrence.status, 'pending'),
    ),
    with: { task: { with: { user: true } } },
  });
}

// Re-export to silence unused-import warnings if user table referenced elsewhere
export { user };
