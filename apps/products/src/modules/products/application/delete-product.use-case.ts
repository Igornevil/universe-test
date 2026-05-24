import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import {
  ENVELOPE_SCHEMA_VERSION,
  ProductRoutingKey,
  type ProductDeletedEvent,
} from '@universe/contracts';

import { ProductNotFoundError } from '../domain/errors';
import { assertProductId } from '../domain/product';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../domain/product.repository';

import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher';

export interface DeleteProductInput {
  id: string;
}

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(input: DeleteProductInput): Promise<void> {
    assertProductId(input.id);

    const existing = await this.products.findById(input.id);
    if (!existing) {
      throw new ProductNotFoundError(input.id);
    }

    await this.products.delete(input.id);

    const event: ProductDeletedEvent = {
      eventId: randomUUID(),
      eventName: ProductRoutingKey.Deleted,
      occurredAt: new Date().toISOString(),
      schemaVersion: ENVELOPE_SCHEMA_VERSION,
      data: { id: input.id },
    };

    await this.publisher.publish(event);
  }
}
