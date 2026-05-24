import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load env from the repo root .env so that PRODUCTS_DATABASE_URL is available
// when drizzle-kit runs from this app's directory.
loadEnv({ path: ['../../.env', '.env'] });

const databaseUrl = process.env.PRODUCTS_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('PRODUCTS_DATABASE_URL is required to run drizzle-kit');
}

export default defineConfig({
  schema: './src/modules/products/infrastructure/schema.ts',
  out: './src/modules/products/infrastructure/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
