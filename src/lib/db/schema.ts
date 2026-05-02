import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  time,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Better-Auth tables ────────────────────────────────────────────────────────
// Schema mirrors Better-Auth defaults. Adapter expects these exact names.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // App-specific profile fields
  phone: text('phone'),
  timezone: text('timezone').notNull().default('America/Los_Angeles'),
  reminderChannel: text('reminder_channel', { enum: ['email', 'sms', 'both'] })
    .notNull()
    .default('email'),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── App tables ────────────────────────────────────────────────────────────────

export const recurrenceType = pgEnum('recurrence_type', [
  'every_n_days',
  'weekdays',
  'month_dates',
  'yearly_date',
]);

export const occurrenceStatus = pgEnum('occurrence_status', ['pending', 'done', 'missed']);

export const category = pgTable(
  'category',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#6366f1'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('category_user_id_idx').on(t.userId)],
);

export const task = pgTable(
  'task',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => category.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    recurrenceType: recurrenceType('recurrence_type').notNull(),
    /**
     * Shape per type:
     *  every_n_days:  { n: number, anchorDate: 'YYYY-MM-DD' }
     *  weekdays:      { days: number[] }    // 0=Sun .. 6=Sat
     *  month_dates:   { days: number[] }    // 1..31
     *  yearly_date:   { month: number, day: number }
     */
    recurrenceConfig: jsonb('recurrence_config').notNull(),
    reminderTime: time('reminder_time').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('task_user_id_idx').on(t.userId), index('task_active_idx').on(t.isActive)],
);

export const taskOccurrence = pgTable(
  'task_occurrence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => task.id, { onDelete: 'cascade' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    status: occurrenceStatus('status').notNull().default('pending'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('occurrence_task_scheduled_uniq').on(t.taskId, t.scheduledFor),
    index('occurrence_scheduled_idx').on(t.scheduledFor),
    index('occurrence_status_idx').on(t.status),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  categories: many(category),
  tasks: many(task),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  user: one(user, { fields: [task.userId], references: [user.id] }),
  category: one(category, { fields: [task.categoryId], references: [category.id] }),
  occurrences: many(taskOccurrence),
}));

export const taskOccurrenceRelations = relations(taskOccurrence, ({ one }) => ({
  task: one(task, { fields: [taskOccurrence.taskId], references: [task.id] }),
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
  user: one(user, { fields: [category.userId], references: [user.id] }),
  tasks: many(task),
}));

