import { useState, type FormEvent } from 'react';

interface Props {
  initial: {
    name: string;
    phone: string | null;
    timezone: string;
    reminderChannel: 'email' | 'sms' | 'both';
  };
}

const COMMON_TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

const inputCls =
  'block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900';

export default function ProfileForm({ initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [timezone, setTimezone] = useState(initial.timezone);
  const [reminderChannel, setReminderChannel] = useState(initial.reminderChannel);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        phone: phone.trim() || null,
        timezone,
        reminderChannel,
      }),
    });
    setBusy(false);
    if (res.ok) setMsg({ kind: 'ok', text: 'Saved' });
    else {
      const e = await res.json().catch(() => ({}));
      setMsg({ kind: 'err', text: e?.error ?? 'Save failed' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls + ' mt-1'}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium">
          Phone <span className="text-neutral-500">(for SMS reminders)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          className={inputCls + ' mt-1'}
        />
      </div>

      <div>
        <label htmlFor="tz" className="block text-sm font-medium">
          Timezone
        </label>
        <select
          id="tz"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={inputCls + ' mt-1'}
        >
          {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Reminder method</label>
        <div className="mt-2 flex gap-2">
          {(['email', 'sms', 'both'] as const).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setReminderChannel(c)}
              className={
                'min-h-11 flex-1 rounded-md border px-3 text-sm capitalize ' +
                (reminderChannel === c
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <p className={'text-sm ' + (msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600')}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
