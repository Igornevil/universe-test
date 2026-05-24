import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import {
  ENVELOPE_SCHEMA_VERSION,
  ProductRoutingKey,
  type ProductCreatedEvent,
} from '@universe/contracts';

import { Money } from '../domain/money';
import { Product } from '../domain/product';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../domain/product.repository';

import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher';

export interface CreateProductInput {
  name: string;
  description: string;
  priceCents: number;
  currency: 'USD';
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const price = Money.fromCents(input.priceCents, input.currency);
    const product = Product.create({
      name: input.name,
      description: input.description,
      price,
    });

    await this.products.save(product);

    const event: ProductCreatedEvent = {
      eventId: randomUUID(),
      eventName: ProductRoutingKey.Created,
      occurredAt: product.createdAt.toISOString(),
      schemaVersion: ENVELOPE_SCHEMA_VERSION,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.price.toCents(),
        currency: product.price.getCurrency(),
      },
    };

    await this.publisher.publish(event);

    return product;
  }
}
