import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: ['../../.env', '.env'] });

const databaseUrl = process.env.NOTIFICATIONS_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('NOTIFICATIONS_DATABASE_URL is required to run drizzle-kit');
}

export default defineConfig({
  schema: './src/modules/product-notifications/infrastructure/schema.ts',
  out: './src/modules/product-notifications/infrastructure/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
