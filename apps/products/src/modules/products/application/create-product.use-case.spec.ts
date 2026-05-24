import { ProductRoutingKey, productCreatedEventSchema } from '@universe/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryProductRepository } from './__fixtures__/in-memory-product.repository';
import { RecordingEventPublisher } from './__fixtures__/recording-event-publisher';
import { CreateProductUseCase } from './create-product.use-case';

describe('CreateProductUseCase', () => {
  let products: InMemoryProductRepository;
  let publisher: RecordingEventPublisher;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    publisher = new RecordingEventPublisher();
    useCase = new CreateProductUseCase(products, publisher);
  });

  it('persists the product and returns it', async () => {
    const product = await useCase.execute({
      name: 'Coffee Mug',
      description: 'A nice mug',
      priceCents: 1500,
      currency: 'USD',
    });

    expect(product.name).toBe('Coffee Mug');
    expect(product.price.toCents()).toBe(1500);
    expect(products.size()).toBe(1);
  });

  it('publishes a product.created event matching the contract schema', async () => {
    const product = await useCase.execute({
      name: 'Coffee Mug',
      description: 'A nice mug',
      priceCents: 1500,
      currency: 'USD',
    });

    expect(publisher.published).toHaveLength(1);
    const event = publisher.published[0];
    expect(event).toBeDefined();
    expect(event!.eventName).toBe(ProductRoutingKey.Created);

    const parsed = productCreatedEventSchema.parse(event);
    expect(parsed.data.id).toBe(product.id);
    expect(parsed.data.name).toBe('Coffee Mug');
    expect(parsed.data.priceCents).toBe(1500);
  });

  it('does not publish an event when persistence fails', async () => {
    const boom = new Error('db down');
    products.save = async () => {
      throw boom;
    };

    await expect(
      useCase.execute({ name: 'X', description: '', priceCents: 100, currency: 'USD' }),
    ).rejects.toThrow(boom);

    expect(publisher.published).toHaveLength(0);
  });
});
