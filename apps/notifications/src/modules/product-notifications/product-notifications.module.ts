import { Module } from '@nestjs/common';

import { ConsumeProductEventHandler } from './application/consume-product-event.handler';
import { NOTIFICATION_REPOSITORY } from './domain/notification';
import { DrizzleNotificationRepository } from './infrastructure/notification.repository';
import { ProductEventsConsumer } from './infrastructure/product-events.consumer';

/**
 * Product notifications feature module. Listens to the products exchange,
 * persists each event into the notifications DB (idempotent by eventId).
 * Depends only on the generic `DatabaseModule` (postgres client) and
 * `MessagingModule` (AMQP connection), both registered globally by AppModule.
 */
@Module({
  providers: [
    ConsumeProductEventHandler,
    DrizzleNotificationRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: DrizzleNotificationRepository },
    ProductEventsConsumer,
  ],
})
export class ProductNotificationsModule {}
