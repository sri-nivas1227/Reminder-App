import TaskForm, { type CategoryOption, type TaskFormValues } from './TaskForm';

interface Props {
  categories: CategoryOption[];
}

export default function NewTaskClient({ categories }: Props) {
  async function handleCreate(values: TaskFormValues) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        categoryId: values.categoryId,
        reminderTime: values.reminderTime,
        recurrence: values.recurrence,
        isActive: values.isActive,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? 'Failed to create task');
    }
    window.location.href = '/';
  }

  return <TaskForm categories={categories} onSubmit={handleCreate} submitLabel="Create task" />;
}
