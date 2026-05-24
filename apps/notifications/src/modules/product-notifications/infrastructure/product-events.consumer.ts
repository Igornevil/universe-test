import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  NOTIFICATIONS_PRODUCT_DLQ,
  NOTIFICATIONS_PRODUCT_QUEUE,
  PRODUCTS_DLX,
  PRODUCTS_EXCHANGE,
  PRODUCTS_EXCHANGE_TYPE,
  PRODUCT_EVENTS_BINDING_PATTERN,
  productEventSchema,
} from '@universe/contracts';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

import { AmqpConnection } from '../../../shared/messaging/amqp-connection';
import { ConsumeProductEventHandler } from '../application/consume-product-event.handler';

const PREFETCH = 10;

/**
 * Subscribes to the `products` topic exchange with binding `product.*` and
 * fans every received message through ConsumeProductEventHandler.
 *
 * Ack policy:
 *   - Schema-invalid message  → nack without requeue → routed to DLQ via DLX
 *   - Transient handler error → nack with requeue (retry on the same queue)
 *   - Success                 → ack
 */
@Injectable()
export class ProductEventsConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ProductEventsConsumer.name);
  private channel!: ChannelWrapper;

  constructor(
    private readonly amqp: AmqpConnection,
    private readonly handler: ConsumeProductEventHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.channel = this.amqp.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(PRODUCTS_EXCHANGE, PRODUCTS_EXCHANGE_TYPE, {
          durable: true,
        });
        await channel.assertExchange(PRODUCTS_DLX, 'fanout', { durable: true });
        await channel.assertQueue(NOTIFICATIONS_PRODUCT_DLQ, { durable: true });
        await channel.bindQueue(NOTIFICATIONS_PRODUCT_DLQ, PRODUCTS_DLX, '');

        await channel.assertQueue(NOTIFICATIONS_PRODUCT_QUEUE, {
          durable: true,
          deadLetterExchange: PRODUCTS_DLX,
        });
        await channel.bindQueue(
          NOTIFICATIONS_PRODUCT_QUEUE,
          PRODUCTS_EXCHANGE,
          PRODUCT_EVENTS_BINDING_PATTERN,
        );

        await channel.prefetch(PREFETCH);

        await channel.consume(
          NOTIFICATIONS_PRODUCT_QUEUE,
          (msg) => {
            if (msg) {
              void this.handle(channel, msg);
            }
          },
          { noAck: false },
        );

        this.logger.log(
          `Consuming "${NOTIFICATIONS_PRODUCT_QUEUE}" (pattern "${PRODUCT_EVENTS_BINDING_PATTERN}")`,
        );
      },
    });
  }

  private async handle(channel: ConfirmChannel, message: ConsumeMessage): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(message.content.toString('utf8'));
    } catch (error) {
      this.logger.error(
        { err: (error as Error).message, routingKey: message.fields.routingKey },
        'Failed to parse message JSON, sending to DLQ',
      );
      channel.nack(message, false, false);
      return;
    }

    const validation = productEventSchema.safeParse(parsed);
    if (!validation.success) {
      this.logger.error(
        { routingKey: message.fields.routingKey, issues: validation.error.issues },
        'Message failed schema validation, sending to DLQ',
      );
      channel.nack(message, false, false);
      return;
    }

    try {
      await this.handler.execute(validation.data);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        {
          err: (error as Error).message,
          eventId: validation.data.eventId,
          eventName: validation.data.eventName,
        },
        'Transient error handling event, requeueing',
      );
      channel.nack(message, false, true);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing AMQP consumer channel');
    try {
      await this.channel?.close();
    } catch (error) {
      this.logger.warn(`Error closing channel: ${(error as Error).message}`);
    }
  }
}
