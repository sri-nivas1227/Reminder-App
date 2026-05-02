import { env } from '../env';

export interface ReminderSmsInput {
  to: string;
  taskTitle: string;
  scheduledFor: Date;
  timezone: string;
}

export async function sendReminderSms(_input: ReminderSmsInput): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    return { ok: false, skipped: true, error: 'Twilio not configured' };
  }
  // TODO: implement when Twilio credentials available
  return { ok: false, skipped: true, error: 'SMS not implemented yet' };
}
