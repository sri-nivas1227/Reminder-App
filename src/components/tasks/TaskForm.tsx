import { useState, type FormEvent } from 'react';
import RecurrenceFields from './RecurrenceFields';
import type { RecurrenceRule } from '../../lib/recurrence';

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

export interface TaskFormValues {
  title: string;
  categoryId: string | null;
  reminderTime: string;
  recurrence: RecurrenceRule;
  isActive: boolean;
}

interface Props {
  initial?: Partial<TaskFormValues> & { id?: string };
  categories: CategoryOption[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
}

const inputCls =
  'block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900';

const today = () => new Date().toISOString().slice(0, 10);

export default function TaskForm({
  initial,
  categories,
  onSubmit,
  onDelete,
  submitLabel = 'Save task',
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [reminderTime, setReminderTime] = useState(initial?.reminderTime ?? '09:00');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    initial?.recurrence ?? { type: 'every_n_days', n: 1, anchorDate: today() },
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), categoryId, reminderTime, recurrence, isActive });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wash hair"
          className={inputCls + ' mt-1'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className={inputCls + ' mt-1'}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium">
            Reminder time
          </label>
          <input
            id="time"
            type="time"
            required
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className={inputCls + ' mt-1'}
          />
        </div>
      </div>

      <RecurrenceFields value={recurrence} onChange={setRecurrence} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        Active (uncheck to pause reminders)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-2 pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
