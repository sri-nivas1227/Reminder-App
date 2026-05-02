import type { APIRoute } from 'astro';
import { db } from '../../../lib/db/client';
import { task, taskOccurrence } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { taskInputSchema } from '../../../lib/validators/task';
import { occurrencesBetween } from '../../../lib/recurrence';
import { badRequest, json, serverError, unauthorized } from '../../../lib/api/response';

export const prerender = false;

const HORIZON_DAYS = 30;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return unauthorized();
  const rows = await db.query.task.findMany({
    where: eq(task.userId, locals.user.id),
    with: { category: true },
    orderBy: [desc(task.createdAt)],
  });
  return json({ tasks: rows });
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const userId = locals.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = taskInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid task input', parsed.error.flatten());
  }
  const input = parsed.data;

  try {
    const [created] = await db
      .insert(task)
      .values({
        userId,
        title: input.title,
        categoryId: input.categoryId ?? null,
        reminderTime: input.reminderTime,
        recurrenceType: input.recurrence.type,
        recurrenceConfig: input.recurrence,
        isActive: input.isActive ?? true,
      })
      .returning();

    // Materialize next-30d occurrences
    const tz = (locals.user as { timezone?: string }).timezone ?? 'America/Los_Angeles';
    const start = new Date();
    const end = new Date(Date.now() + HORIZON_DAYS * 86400_000);
    const dates = occurrencesBetween(input.recurrence, input.reminderTime, start, end, tz);
    if (dates.length) {
      await db
        .insert(taskOccurrence)
        .values(dates.map((d) => ({ taskId: created.id, scheduledFor: d })))
        .onConflictDoNothing();
    }

    return json({ task: created }, { status: 201 });
  } catch (err) {
    console.error(err);
    return serverError('Failed to create task');
  }
};
