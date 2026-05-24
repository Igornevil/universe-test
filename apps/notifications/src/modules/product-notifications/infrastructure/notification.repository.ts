import { Inject, Injectable } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

import { DATABASE_CLIENT } from '../../../shared/database/database.module';
import type { Notification, NotificationRepository } from '../domain/notification';

import { notifications } from './schema';

type NotificationsDatabase = PostgresJsDatabase<{ notifications: typeof notifications }>;

@Injectable()
export class DrizzleNotificationRepository implements NotificationRepository {
  private readonly db: NotificationsDatabase;

  constructor(@Inject(DATABASE_CLIENT) client: Sql) {
    this.db = drizzle(client, { schema: { notifications } });
  }

  async save(notification: Notification): Promise<boolean> {
    const inserted = await this.db
      .insert(notifications)
      .values({
        id: notification.id,
        eventId: notification.eventId,
        eventName: notification.eventName,
        occurredAt: notification.occurredAt,
        receivedAt: notification.receivedAt,
        payload: notification.payload,
      })
      .onConflictDoNothing({ target: notifications.eventId })
      .returning({ id: notifications.id });

    return inserted.length > 0;
  }
}
