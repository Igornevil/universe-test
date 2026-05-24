import { sql } from 'drizzle-orm';
import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey(),
  eventId: uuid('event_id').notNull().unique(),
  eventName: varchar('event_name', { length: 64 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
  payload: jsonb('payload').notNull(),
});

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
