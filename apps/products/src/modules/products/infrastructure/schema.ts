import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  priceCents: integer('price_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
});

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
