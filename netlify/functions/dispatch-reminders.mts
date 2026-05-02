import type { Config } from '@netlify/functions';

/**
 * Netlify scheduled function. Pings our internal cron endpoint with the
 * shared secret. Runs every minute (configured in netlify.toml).
 *
 * Required env vars on the Netlify site:
 *   - URL          (auto-set by Netlify to the deployed site URL)
 *   - CRON_SECRET  (must match the value used by the SSR app)
 */
export default async () => {
  const baseUrl = process.env.URL ?? process.env.AUTH_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) return new Response('URL env var not set', { status: 500 });
  if (!secret) return new Response('CRON_SECRET not set', { status: 500 });

  const target = `${baseUrl.replace(/\/$/, '')}/api/cron/dispatch`;

  const res = await fetch(target, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  console.log('[dispatch-reminders]', res.status, body);

  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: '* * * * *',
};
