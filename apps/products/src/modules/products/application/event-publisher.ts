import type { ProductEvent } from '@universe/contracts';

export const EVENT_PUBLISHER = 'EventPublisher';

/**
 * Outbound port for publishing domain events to the broker.
 * The application layer depends on this abstraction; the concrete
 * RabbitMQ implementation lives in infrastructure/messaging.
 */
export interface EventPublisher {
  publish(event: ProductEvent): Promise<void>;
}
