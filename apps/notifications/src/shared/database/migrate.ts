/* eslint-disable no-console */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate as drizzleMigrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Generic migration runner: takes a Postgres URL and a folder of `.sql`
 * migrations, applies the pending ones, and closes the connection.
 * Used by feature modules' own `migrate.ts` scripts.
 */
export const runMigrations = async (params: {
  databaseUrl: string;
  migrationsFolder: string;
  label: string;
}): Promise<void> => {
  const client = postgres(params.databaseUrl, { max: 1 });
  const db = drizzle(client);
  try {
    console.log(`Running ${params.label} migrations...`);
    await drizzleMigrate(db, { migrationsFolder: params.migrationsFolder });
    console.log('Migrations applied');
  } finally {
    await client.end({ timeout: 5 });
  }
};
