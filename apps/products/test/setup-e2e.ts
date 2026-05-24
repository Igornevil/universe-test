import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { products } from '../src/modules/products/infrastructure/schema';

loadEnv({ path: ['../../.env', '.env'] });

const databaseUrl = process.env.PRODUCTS_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('PRODUCTS_DATABASE_URL must be set for e2e tests');
}

export const e2eDatabaseUrl = databaseUrl;

export const resetDatabase = async (): Promise<void> => {
  const client = postgres(e2eDatabaseUrl, { max: 1 });
  const db = drizzle(client);
  try {
    await migrate(db, {
      migrationsFolder: 'src/modules/products/infrastructure/migrations',
    });
    await db.delete(products);
  } finally {
    await client.end({ timeout: 5 });
  }
};
