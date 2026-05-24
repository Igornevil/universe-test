import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ProductEvent } from '@universe/contracts';

import { NOTIFICATION_REPOSITORY, type NotificationRepository } from '../domain/notification';

export interface ConsumeProductEventResult {
  stored: boolean;
}

@Injectable()
export class ConsumeProductEventHandler {
  private readonly logger = new Logger(ConsumeProductEventHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
  ) {}

  async execute(event: ProductEvent): Promise<ConsumeProductEventResult> {
    const stored = await this.notifications.save({
      id: randomUUID(),
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: new Date(event.occurredAt),
      receivedAt: new Date(),
      payload: event.data,
    });

    this.logger.log(
      {
        eventId: event.eventId,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        stored,
      },
      stored ? 'Notification stored' : 'Duplicate event ignored (idempotency)',
    );

    return { stored };
  }
}
