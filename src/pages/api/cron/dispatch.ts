import type { APIRoute } from 'astro';
import { dispatchReminders } from '../../../lib/reminders/dispatch';
import { env } from '../../../lib/env';
import { json, unauthorized } from '../../../lib/api/response';

export const prerender = false;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function authorized(request: Request): boolean {
  if (!env.CRON_SECRET) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.CRON_SECRET}`;
  return timingSafeEqual(header, expected);
}

export const POST: APIRoute = async ({ request }) => {
  if (!authorized(request)) return unauthorized();
  const stats = await dispatchReminders();
  return json(stats);
};

// Allow GET for dead-simple cron pings (Netlify scheduled funcs send GET).
export const GET: APIRoute = async ({ request }) => {
  if (!authorized(request)) return unauthorized();
  const stats = await dispatchReminders();
  return json(stats);
};
