import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db/client';
import { task, taskOccurrence } from '../../../../lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { badRequest, json, notFound, unauthorized } from '../../../../lib/api/response';

export const prerender = false;

const statusSchema = z.object({
  status: z.enum(['done', 'missed', 'pending']),
});

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return unauthorized();
  const occId = params.id!;

  const occ = await db.query.taskOccurrence.findFirst({
    where: eq(taskOccurrence.id, occId),
    with: { task: true },
  });
  if (!occ || occ.task.userId !== locals.user.id) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid status', parsed.error.flatten());

  const { status } = parsed.data;
  const [updated] = await db
    .update(taskOccurrence)
    .set({
      status,
      completedAt: status === 'done' ? new Date() : null,
    })
    .where(and(eq(taskOccurrence.id, occId), eq(taskOccurrence.taskId, occ.task.id)))
    .returning();

  // Reference task to satisfy type
  void task;

  return json({ occurrence: updated });
};
