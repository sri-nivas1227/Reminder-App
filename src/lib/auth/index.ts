import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { env } from '../env';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;

export const auth = betterAuth({
  baseURL: env.AUTH_URL,
  secret: env.AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: THIRTY_DAYS,
    updateAge: ONE_DAY,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  user: {
    additionalFields: {
      phone: { type: 'string', required: false },
      timezone: { type: 'string', required: false, defaultValue: 'America/Los_Angeles' },
      reminderChannel: { type: 'string', required: false, defaultValue: 'email' },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
