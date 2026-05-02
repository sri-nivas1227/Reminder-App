import { and, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import { db } from './client';
import { category, task, taskOccurrence } from './schema';

export interface HistoryFilter {
  taskId?: string;
  status?: 'pending' | 'done' | 'missed';
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function listHistory(userId: string, f: HistoryFilter = {}) {
  const conds: SQL[] = [eq(task.userId, userId)];
  if (f.taskId) conds.push(eq(taskOccurrence.taskId, f.taskId));
  if (f.status) conds.push(eq(taskOccurrence.status, f.status));
  if (f.from) conds.push(gte(taskOccurrence.scheduledFor, f.from));
  if (f.to) conds.push(lt(taskOccurrence.scheduledFor, f.to));

  return db
    .select({
      occurrenceId: taskOccurrence.id,
      scheduledFor: taskOccurrence.scheduledFor,
      status: taskOccurrence.status,
      completedAt: taskOccurrence.completedAt,
      taskId: task.id,
      title: task.title,
      categoryName: category.name,
      categoryColor: category.color,
    })
    .from(taskOccurrence)
    .innerJoin(task, eq(taskOccurrence.taskId, task.id))
    .leftJoin(category, eq(task.categoryId, category.id))
    .where(and(...conds))
    .orderBy(desc(taskOccurrence.scheduledFor))
    .limit(f.limit ?? 200);
}

/** Per-task aggregates for the user. */
export async function perTaskStats(userId: string) {
  return db
    .select({
      taskId: task.id,
      title: task.title,
      done: sql<number>`count(*) filter (where ${taskOccurrence.status} = 'done')::int`,
      missed: sql<number>`count(*) filter (where ${taskOccurrence.status} = 'missed')::int`,
      pending: sql<number>`count(*) filter (where ${taskOccurrence.status} = 'pending')::int`,
    })
    .from(task)
    .leftJoin(taskOccurrence, eq(taskOccurrence.taskId, task.id))
    .where(eq(task.userId, userId))
    .groupBy(task.id, task.title)
    .orderBy(task.title);
}
