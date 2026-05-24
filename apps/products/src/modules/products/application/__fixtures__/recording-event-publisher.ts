import type { ProductEvent } from '@universe/contracts';

import type { EventPublisher } from '../event-publisher';

export class RecordingEventPublisher implements EventPublisher {
  readonly published: ProductEvent[] = [];

  async publish(event: ProductEvent): Promise<void> {
    this.published.push(event);
  }
}
