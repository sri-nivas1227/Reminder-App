import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db/client';
import { task, taskOccurrence } from '../../../../lib/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { taskUpdateSchema } from '../../../../lib/validators/task';
import { occurrencesBetween } from '../../../../lib/recurrence';
import {
  badRequest,
  json,
  notFound,
  serverError,
  unauthorized,
} from '../../../../lib/api/response';

export const prerender = false;

const HORIZON_DAYS = 30;

async function loadOwned(userId: string, taskId: string) {
  return db.query.task.findFirst({
    where: and(eq(task.id, taskId), eq(task.userId, userId)),
  });
}

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  const row = await db.query.task.findFirst({
    where: and(eq(task.id, id), eq(task.userId, locals.user.id)),
    with: { category: true },
  });
  if (!row) return notFound();
  return json({ task: row });
};

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  const existing = await loadOwned(locals.user.id, id);
  if (!existing) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid task update', parsed.error.flatten());
  }
  const upd = parsed.data;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (upd.title !== undefined) patch.title = upd.title;
  if (upd.categoryId !== undefined) patch.categoryId = upd.categoryId;
  if (upd.reminderTime !== undefined) patch.reminderTime = upd.reminderTime;
  if (upd.recurrence !== undefined) {
    patch.recurrenceType = upd.recurrence.type;
    patch.recurrenceConfig = upd.recurrence;
  }
  if (upd.isActive !== undefined) patch.isActive = upd.isActive;

  try {
    const [updated] = await db.update(task).set(patch).where(eq(task.id, id)).returning();

    const recurrenceChanged =
      upd.recurrence !== undefined ||
      upd.reminderTime !== undefined ||
      upd.isActive !== undefined;

    if (recurrenceChanged) {
      // Drop future pending occurrences and re-materialize
      const now = new Date();
      await db
        .delete(taskOccurrence)
        .where(
          and(
            eq(taskOccurrence.taskId, id),
            eq(taskOccurrence.status, 'pending'),
            gte(taskOccurrence.scheduledFor, now),
          ),
        );

      if (updated.isActive) {
        const tz =
          (locals.user as { timezone?: string }).timezone ?? 'America/Los_Angeles';
        const dates = occurrencesBetween(
          updated.recurrenceConfig as never,
          updated.reminderTime,
          now,
          new Date(Date.now() + HORIZON_DAYS * 86400_000),
          tz,
        );
        if (dates.length) {
          await db
            .insert(taskOccurrence)
            .values(dates.map((d) => ({ taskId: id, scheduledFor: d })))
            .onConflictDoNothing();
        }
      }
    }

    return json({ task: updated });
  } catch (err) {
    console.error(err);
    return serverError('Failed to update task');
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  const existing = await loadOwned(locals.user.id, id);
  if (!existing) return notFound();
  await db.delete(task).where(eq(task.id, id));
  return json({ ok: true });
};
