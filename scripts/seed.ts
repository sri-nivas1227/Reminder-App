import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/db/schema';

const DEFAULT_CATEGORIES = [
  { name: 'Hygiene', color: '#06b6d4' },
  { name: 'Laundry', color: '#8b5cf6' },
  { name: 'Skincare', color: '#ec4899' },
  { name: 'Health', color: '#10b981' },
  { name: 'Home', color: '#f59e0b' },
  { name: 'Other', color: '#6366f1' },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('Seeding system categories…');

  for (const c of DEFAULT_CATEGORIES) {
    await db
      .insert(schema.category)
      .values({ name: c.name, color: c.color, userId: null })
      .onConflictDoNothing();
  }

  console.log('Done.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
