import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { task, taskOccurrence, user } from '../db/schema';
import { env } from '../env';
import { sendReminderEmail } from './email';
import { sendReminderSms } from './sms';

export interface DispatchStats {
  windowStart: string;
  windowEnd: string;
  candidates: number;
  claimed: number;
  emailsSent: number;
  smsSent: number;
  failures: number;
  details: Array<{
    occurrenceId: string;
    channel: 'email' | 'sms' | 'both';
    ok: boolean;
    error?: string;
  }>;
}

/**
 * Find all `pending` occurrences whose `scheduled_for` falls within the fire
 * window, atomically claim them (set `reminder_sent_at = now()`), then send.
 *
 * Window = [now + lead - half, now + lead + half]
 * `lead` = `REMINDER_LEAD_MINUTES` (default 5)
 * `half` = `windowMinutes / 2` (default 1) — keeps overlap small even if cron jitters
 */
export async function dispatchReminders(opts: {
  now?: Date;
  windowMinutes?: number;
} = {}): Promise<DispatchStats> {
  const now = opts.now ?? new Date();
  const windowMinutes = opts.windowMinutes ?? 2;
  const lead = env.REMINDER_LEAD_MINUTES;

  const half = (windowMinutes * 60_000) / 2;
  const targetCenter = now.getTime() + lead * 60_000;
  const windowStart = new Date(targetCenter - half);
  const windowEnd = new Date(targetCenter + half);

  // Atomic claim: set reminder_sent_at = now() ONLY where it was null.
  const claimed = await db
    .update(taskOccurrence)
    .set({ reminderSentAt: sql`now()` })
    .where(
      and(
        eq(taskOccurrence.status, 'pending'),
        isNull(taskOccurrence.reminderSentAt),
        gte(taskOccurrence.scheduledFor, windowStart),
        lt(taskOccurrence.scheduledFor, windowEnd),
      ),
    )
    .returning({
      occurrenceId: taskOccurrence.id,
      taskId: taskOccurrence.taskId,
      scheduledFor: taskOccurrence.scheduledFor,
    });

  const stats: DispatchStats = {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    candidates: claimed.length,
    claimed: claimed.length,
    emailsSent: 0,
    smsSent: 0,
    failures: 0,
    details: [],
  };

  if (claimed.length === 0) return stats;

  // Hydrate task + user for each claimed row
  const taskIds = Array.from(new Set(claimed.map((c) => c.taskId)));
  const tasks = await db.query.task.findMany({
    where: (t, { inArray }) => inArray(t.id, taskIds),
    with: { user: true },
  });
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  for (const c of claimed) {
    const t = taskMap.get(c.taskId);
    if (!t) {
      stats.failures++;
      stats.details.push({
        occurrenceId: c.occurrenceId,
        channel: 'email',
        ok: false,
        error: 'Task not found',
      });
      continue;
    }
    const u = t.user;
    const channel = u.reminderChannel as 'email' | 'sms' | 'both';

    let anyOk = false;
    let lastError: string | undefined;

    if (channel === 'email' || channel === 'both') {
      const r = await sendReminderEmail({
        to: u.email,
        taskTitle: t.title,
        scheduledFor: c.scheduledFor,
        timezone: u.timezone,
      });
      if (r.ok) {
        stats.emailsSent++;
        anyOk = true;
      } else {
        lastError = r.error;
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (u.phone) {
        const r = await sendReminderSms({
          to: u.phone,
          taskTitle: t.title,
          scheduledFor: c.scheduledFor,
          timezone: u.timezone,
        });
        if (r.ok) {
          stats.smsSent++;
          anyOk = true;
        } else if (!r.skipped) {
          lastError = r.error;
        }
      } else {
        lastError = 'User has no phone';
      }
    }

    stats.details.push({
      occurrenceId: c.occurrenceId,
      channel,
      ok: anyOk,
      error: anyOk ? undefined : lastError,
    });

    if (!anyOk) {
      stats.failures++;
      // Roll back the claim so future runs can retry
      await db
        .update(taskOccurrence)
        .set({ reminderSentAt: null })
        .where(eq(taskOccurrence.id, c.occurrenceId));
    }
  }

  return stats;
}

// Force user table reference for relation hydration on cold-start bundlers
void user;
