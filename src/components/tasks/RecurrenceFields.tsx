import type { RecurrenceRule } from '../../lib/recurrence';

interface Props {
  value: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const inputCls =
  'block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900';

const selectCls = inputCls;

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function RecurrenceFields({ value, onChange }: Props) {
  function setType(type: RecurrenceRule['type']) {
    if (type === value.type) return;
    switch (type) {
      case 'every_n_days':
        onChange({ type, n: 1, anchorDate: todayISO() });
        break;
      case 'weekdays':
        onChange({ type, days: [1] });
        break;
      case 'month_dates':
        onChange({ type, days: [1] });
        break;
      case 'yearly_date':
        onChange({ type, month: 1, day: 1 });
        break;
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Repeats</label>
        <select
          value={value.type}
          onChange={(e) => setType(e.target.value as RecurrenceRule['type'])}
          className={selectCls + ' mt-1'}
        >
          <option value="every_n_days">Every N days</option>
          <option value="weekdays">Specific weekdays</option>
          <option value="month_dates">Specific dates of month</option>
          <option value="yearly_date">Specific date each year</option>
        </select>
      </div>

      {value.type === 'every_n_days' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Every</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={value.n}
                onChange={(e) => onChange({ ...value, n: Number(e.target.value) || 1 })}
                className={inputCls}
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">days</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Starting</label>
            <input
              type="date"
              value={value.anchorDate}
              onChange={(e) => onChange({ ...value, anchorDate: e.target.value })}
              className={inputCls + ' mt-1'}
            />
          </div>
        </div>
      )}

      {value.type === 'weekdays' && (
        <div>
          <label className="block text-sm font-medium">On</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, idx) => {
              const active = value.days.includes(idx);
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    const set = new Set(value.days);
                    active ? set.delete(idx) : set.add(idx);
                    const next = Array.from(set).sort();
                    if (next.length === 0) return;
                    onChange({ ...value, days: next });
                  }}
                  className={
                    'min-h-11 min-w-11 rounded-md border px-3 text-sm ' +
                    (active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.type === 'month_dates' && (
        <div>
          <label className="block text-sm font-medium">Days of month</label>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const active = value.days.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => {
                    const set = new Set(value.days);
                    active ? set.delete(d) : set.add(d);
                    const next = Array.from(set).sort((a, b) => a - b);
                    if (next.length === 0) return;
                    onChange({ ...value, days: next });
                  }}
                  className={
                    'min-h-10 rounded-md border text-sm ' +
                    (active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800')
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Days 29–31 skipped on shorter months.
          </p>
        </div>
      )}

      {value.type === 'yearly_date' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Month</label>
            <select
              value={value.month}
              onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
              className={selectCls + ' mt-1'}
            >
              {[
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ].map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Day</label>
            <input
              type="number"
              min={1}
              max={31}
              value={value.day}
              onChange={(e) => onChange({ ...value, day: Number(e.target.value) || 1 })}
              className={inputCls + ' mt-1'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
