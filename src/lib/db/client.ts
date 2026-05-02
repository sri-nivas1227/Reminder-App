import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

const isProd = env.NODE_ENV === 'production';
const url = env.DATABASE_URL;
const requiresSsl = isProd || /\bsslmode=(require|verify-full|verify-ca)\b/i.test(url);

const queryClient = postgres(url, {
  max: isProd ? 10 : 5,
  ssl: requiresSsl ? 'require' : false,
});

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
