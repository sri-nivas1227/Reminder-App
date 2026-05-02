import { and, eq, gte, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from './client';
import { category, task, taskOccurrence } from './schema';

/** System + user-owned categories. */
export async function listCategories(userId: string) {
  return db
    .select()
    .from(category)
    .where(or(isNull(category.userId), eq(category.userId, userId)));
}

/** Occurrences for the user in [start, end), with task + category joined. */
export async function listOccurrences(userId: string, start: Date, end: Date) {
  return db
    .select({
      occurrenceId: taskOccurrence.id,
      scheduledFor: taskOccurrence.scheduledFor,
      status: taskOccurrence.status,
      completedAt: taskOccurrence.completedAt,
      taskId: task.id,
      title: task.title,
      reminderTime: task.reminderTime,
      isActive: task.isActive,
      categoryId: task.categoryId,
      categoryName: category.name,
      categoryColor: category.color,
    })
    .from(taskOccurrence)
    .innerJoin(task, eq(taskOccurrence.taskId, task.id))
    .leftJoin(category, eq(task.categoryId, category.id))
    .where(
      and(
        eq(task.userId, userId),
        gte(taskOccurrence.scheduledFor, start),
        lt(taskOccurrence.scheduledFor, end),
      ),
    )
    .orderBy(taskOccurrence.scheduledFor);
}

/** Lifetime done/missed counts. */
export async function statsFor(userId: string) {
  const rows = await db
    .select({
      status: taskOccurrence.status,
      count: sql<number>`count(*)::int`,
    })
    .from(taskOccurrence)
    .innerJoin(task, eq(taskOccurrence.taskId, task.id))
    .where(eq(task.userId, userId))
    .groupBy(taskOccurrence.status);

  const stats = { done: 0, missed: 0, pending: 0 };
  for (const r of rows) stats[r.status] = r.count;
  return stats;
}
