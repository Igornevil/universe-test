import { ProductRoutingKey, productDeletedEventSchema } from '@universe/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { InvalidProductIdError, ProductNotFoundError } from '../domain/errors';
import { Money } from '../domain/money';
import { Product } from '../domain/product';

import { InMemoryProductRepository } from './__fixtures__/in-memory-product.repository';
import { RecordingEventPublisher } from './__fixtures__/recording-event-publisher';
import { DeleteProductUseCase } from './delete-product.use-case';

describe('DeleteProductUseCase', () => {
  let products: InMemoryProductRepository;
  let publisher: RecordingEventPublisher;
  let useCase: DeleteProductUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    publisher = new RecordingEventPublisher();
    useCase = new DeleteProductUseCase(products, publisher);
  });

  it('deletes an existing product and publishes a product.deleted event', async () => {
    const product = Product.create({ name: 'X', description: '', price: Money.fromCents(100) });
    await products.save(product);

    await useCase.execute({ id: product.id });

    expect(products.size()).toBe(0);
    expect(publisher.published).toHaveLength(1);
    const event = publisher.published[0];
    expect(event!.eventName).toBe(ProductRoutingKey.Deleted);

    const parsed = productDeletedEventSchema.parse(event);
    expect(parsed.data.id).toBe(product.id);
  });

  it('throws ProductNotFoundError when the product is missing', async () => {
    await expect(useCase.execute({ id: '550e8400-e29b-41d4-a716-446655440000' })).rejects.toThrow(
      ProductNotFoundError,
    );

    expect(publisher.published).toHaveLength(0);
  });

  it('throws InvalidProductIdError on a malformed id', async () => {
    await expect(useCase.execute({ id: 'not-a-uuid' })).rejects.toThrow(InvalidProductIdError);
  });
});
