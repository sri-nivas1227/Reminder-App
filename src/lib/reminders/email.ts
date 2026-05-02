import { Resend } from 'resend';
import { env } from '../env';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export interface ReminderEmailInput {
  to: string;
  taskTitle: string;
  scheduledFor: Date;
  timezone: string;
}

function formatLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export async function sendReminderEmail(input: ReminderEmailInput): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}> {
  const c = getClient();
  if (!c) return { ok: false, skipped: true, error: 'RESEND_API_KEY not configured' };
  if (!env.RESEND_FROM_EMAIL) return { ok: false, error: 'RESEND_FROM_EMAIL not configured' };

  const when = formatLocal(input.scheduledFor, input.timezone);
  const subject = `Reminder: ${input.taskTitle}`;
  const text = `Hi —

This is your reminder to: ${input.taskTitle}

Scheduled for: ${when}

Open dashboard: ${env.AUTH_URL}/

— Reminder App`;

  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111;line-height:1.5">
  <p>Hi —</p>
  <p>This is your reminder to:</p>
  <p style="font-size:18px;font-weight:600;margin:12px 0">${escape(input.taskTitle)}</p>
  <p style="color:#555">Scheduled for ${when}.</p>
  <p><a href="${env.AUTH_URL}/" style="display:inline-block;background:#4f46e5;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">Open dashboard</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
  <p style="color:#888;font-size:12px">Reminder App</p>
</body></html>`;

  try {
    const { data, error } = await c.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject,
      text,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
}
