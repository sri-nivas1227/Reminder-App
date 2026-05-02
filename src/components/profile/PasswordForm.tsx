import { useState, type FormEvent } from 'react';
import { authClient } from '../../lib/auth/client';

const inputCls =
  'block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900';

export default function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setBusy(false);
    if (error) setMsg({ kind: 'err', text: error.message ?? 'Change failed' });
    else {
      setMsg({ kind: 'ok', text: 'Password changed. Other sessions signed out.' });
      setCurrent('');
      setNext('');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="current" className="block text-sm font-medium">
          Current password
        </label>
        <input
          id="current"
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputCls + ' mt-1'}
        />
      </div>
      <div>
        <label htmlFor="next" className="block text-sm font-medium">
          New password <span className="text-neutral-500">(min 8 chars)</span>
        </label>
        <input
          id="next"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputCls + ' mt-1'}
        />
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
        {busy ? 'Changing…' : 'Change password'}
      </button>
    </form>
  );
}
