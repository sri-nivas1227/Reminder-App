import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/client';
import { user } from '../../lib/db/schema';
import { profileUpdateSchema } from '../../lib/validators/profile';
import { badRequest, json, serverError, unauthorized } from '../../lib/api/response';

export const prerender = false;

export const PATCH: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid profile', parsed.error.flatten());
  const upd = parsed.data;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (upd.name !== undefined) patch.name = upd.name;
  if (upd.phone !== undefined) patch.phone = upd.phone || null;
  if (upd.timezone !== undefined) patch.timezone = upd.timezone;
  if (upd.reminderChannel !== undefined) patch.reminderChannel = upd.reminderChannel;

  try {
    const [updated] = await db
      .update(user)
      .set(patch)
      .where(eq(user.id, locals.user.id))
      .returning();
    return json({ user: updated });
  } catch (err) {
    console.error(err);
    return serverError('Failed to update profile');
  }
};
