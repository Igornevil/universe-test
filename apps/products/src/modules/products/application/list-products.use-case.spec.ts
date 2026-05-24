import { beforeEach, describe, expect, it } from 'vitest';

import { Money } from '../domain/money';
import { Product } from '../domain/product';

import { InMemoryProductRepository } from './__fixtures__/in-memory-product.repository';
import { ListProductsUseCase } from './list-products.use-case';

const seedProducts = async (repo: InMemoryProductRepository, count: number): Promise<void> => {
  for (let i = 0; i < count; i += 1) {
    const product = Product.create({
      name: `Product ${i}`,
      description: '',
      price: Money.fromCents(100 + i),
    });
    await repo.save(product);
  }
};

describe('ListProductsUseCase', () => {
  let products: InMemoryProductRepository;
  let useCase: ListProductsUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    useCase = new ListProductsUseCase(products);
  });

  it('returns an empty page when the repository is empty', async () => {
    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });

  it('returns the first page of items', async () => {
    await seedProducts(products, 25);

    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
  });

  it('returns the last partial page', async () => {
    await seedProducts(products, 25);

    const result = await useCase.execute({ page: 3, pageSize: 10 });

    expect(result.items).toHaveLength(5);
    expect(result.totalPages).toBe(3);
  });

  it('returns no items when page is beyond the last page', async () => {
    await seedProducts(products, 5);

    const result = await useCase.execute({ page: 5, pageSize: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(1);
  });
});
