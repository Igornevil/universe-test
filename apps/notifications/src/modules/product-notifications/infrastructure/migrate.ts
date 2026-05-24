import path from 'node:path';

import { runMigrations } from '../../../shared/database/migrate';

interface DotenvModule {
  config(options: { path: string[] }): void;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const dotenv = require('dotenv') as DotenvModule;
  dotenv.config({ path: ['../../.env', '.env'] });
} catch {
  // dotenv not installed in production image — that is fine
}

const databaseUrl = process.env.NOTIFICATIONS_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('NOTIFICATIONS_DATABASE_URL is required');
}

runMigrations({
  databaseUrl,
  migrationsFolder: path.resolve(__dirname, './migrations'),
  label: 'Notifications',
}).catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', error);
  process.exit(1);
});
