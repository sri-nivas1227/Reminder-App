import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm');

export const recurrenceRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('every_n_days'),
    n: z.number().int().min(1).max(365),
    anchorDate: isoDate,
  }),
  z.object({
    type: z.literal('weekdays'),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  }),
  z.object({
    type: z.literal('month_dates'),
    days: z.array(z.number().int().min(1).max(31)).min(1).max(31),
  }),
  z.object({
    type: z.literal('yearly_date'),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  }),
]);

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, 'Title required').max(200),
  categoryId: z.string().uuid().nullable().optional(),
  reminderTime: hhmm,
  recurrence: recurrenceRuleSchema,
  isActive: z.boolean().optional().default(true),
});

export const taskUpdateSchema = taskInputSchema.partial();

export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
