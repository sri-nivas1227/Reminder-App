import { useState } from 'react';
import TaskForm, { type CategoryOption, type TaskFormValues } from './TaskForm';
import type { RecurrenceRule } from '../../lib/recurrence';

export interface OccurrenceTile {
  occurrenceId: string;
  scheduledFor: string; // ISO
  status: 'pending' | 'done' | 'missed';
  taskId: string;
  title: string;
  reminderTime: string;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  recurrence: RecurrenceRule;
}

interface Props {
  todays: OccurrenceTile[];
  upcoming: OccurrenceTile[];
  categories: CategoryOption[];
  stats: { done: number; missed: number; pending: number };
}

const STATUS_STYLES: Record<OccurrenceTile['status'], string> = {
  pending: 'border-neutral-300 dark:border-neutral-700',
  done: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  missed: 'border-red-400 bg-red-50 dark:bg-red-950/30',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function Dashboard({ todays, upcoming, categories, stats }: Props) {
  const [editing, setEditing] = useState<OccurrenceTile | null>(null);

  async function setStatus(occurrenceId: string, status: 'done' | 'missed' | 'pending') {
    const res = await fetch(`/api/occurrences/${occurrenceId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) location.reload();
    else alert('Failed to update');
  }

  async function saveEdit(values: TaskFormValues) {
    if (!editing) return;
    const res = await fetch(`/api/tasks/${editing.taskId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error ?? 'Save failed');
    }
    location.reload();
  }

  async function deleteTask() {
    if (!editing) return;
    const res = await fetch(`/api/tasks/${editing.taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    location.reload();
  }

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Done" value={stats.done} tone="emerald" />
        <StatCard label="Missed" value={stats.missed} tone="red" />
        <StatCard label="Pending" value={stats.pending} tone="indigo" />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Today</h2>
        {todays.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nothing scheduled today.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {todays.map((o) => (
              <Tile
                key={o.occurrenceId}
                tile={o}
                onEdit={() => setEditing(o)}
                onSetStatus={(s) => setStatus(o.occurrenceId, s)}
                showActions
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No upcoming reminders in the next week.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {upcoming.map((o) => (
              <Tile
                key={o.occurrenceId}
                tile={o}
                onEdit={() => setEditing(o)}
                onSetStatus={(s) => setStatus(o.occurrenceId, s)}
              />
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <Modal onClose={() => setEditing(null)} title="Edit task">
          <TaskForm
            initial={{
              title: editing.title,
              categoryId: editing.categoryId,
              reminderTime: editing.reminderTime,
              recurrence: editing.recurrence,
              isActive: editing.isActive,
            }}
            categories={categories}
            onSubmit={saveEdit}
            onDelete={deleteTask}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </div>
  );
}

function Tile({
  tile,
  onEdit,
  onSetStatus,
  showActions = false,
}: {
  tile: OccurrenceTile;
  onEdit: () => void;
  onSetStatus: (s: 'done' | 'missed' | 'pending') => void;
  showActions?: boolean;
}) {
  return (
    <li
      className={
        'rounded-lg border p-4 transition hover:shadow-sm ' + STATUS_STYLES[tile.status]
      }
    >
      <button
        type="button"
        onClick={onEdit}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium">{tile.title}</div>
            <div className="mt-1 text-xs text-neutral-500">
              {formatDate(tile.scheduledFor)} · {formatTime(tile.scheduledFor)}
            </div>
          </div>
          {tile.categoryName && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: tile.categoryColor ?? '#6366f1' }}
            >
              {tile.categoryName}
            </span>
          )}
        </div>
      </button>
      {showActions && tile.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onSetStatus('done')}
            className="min-h-10 flex-1 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => onSetStatus('missed')}
            className="min-h-10 flex-1 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Missed
          </button>
        </div>
      )}
      {showActions && tile.status !== 'pending' && (
        <button
          type="button"
          onClick={() => onSetStatus('pending')}
          className="mt-3 text-xs text-neutral-500 hover:underline"
        >
          Mark pending
        </button>
      )}
    </li>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'red' | 'indigo';
}) {
  const toneCls = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600',
  }[tone];
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="truncate text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">
        {label}
      </div>
      <div className={'mt-1 text-xl font-semibold sm:text-2xl ' + toneCls}>{value}</div>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
