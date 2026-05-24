import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { PRODUCTS_EXCHANGE, PRODUCTS_EXCHANGE_TYPE, type ProductEvent } from '@universe/contracts';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

import { AmqpConnection } from '../../../shared/messaging/amqp-connection';
import type { EventPublisher } from '../application/event-publisher';

@Injectable()
export class ProductEventsPublisher
  implements EventPublisher, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ProductEventsPublisher.name);
  private channel!: ChannelWrapper;

  constructor(private readonly amqp: AmqpConnection) {}

  onApplicationBootstrap(): void {
    this.channel = this.amqp.createChannel({
      json: true,
      setup: async (ch: ConfirmChannel) => {
        await ch.assertExchange(PRODUCTS_EXCHANGE, PRODUCTS_EXCHANGE_TYPE, { durable: true });
      },
    });
  }

  async publish(event: ProductEvent): Promise<void> {
    await this.channel.publish(PRODUCTS_EXCHANGE, event.eventName, event, {
      persistent: true,
      contentType: 'application/json',
      messageId: event.eventId,
    });
    this.logger.log(
      { eventId: event.eventId, eventName: event.eventName },
      'Published product event',
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
    } catch (error) {
      this.logger.warn(`Error closing publisher channel: ${(error as Error).message}`);
    }
  }
}
