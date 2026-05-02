import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z
    .string()
    .trim()
    .max(32)
    .regex(/^\+?[0-9 ()-]{7,}$/, 'Invalid phone')
    .nullable()
    .optional(),
  timezone: z.string().min(1).max(64).optional(),
  reminderChannel: z.enum(['email', 'sms', 'both']).optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
