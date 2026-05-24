import type { Product } from '../../domain/product';
import type { ListPage, ListPageQuery, ProductRepository } from '../../domain/product.repository';

export class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.store.set(product.id, product);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async findById(id: string): Promise<Product | null> {
    return this.store.get(id) ?? null;
  }

  async list(query: ListPageQuery): Promise<ListPage> {
    const all = [...this.store.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return {
      items: all.slice(query.offset, query.offset + query.limit),
      total: all.length,
    };
  }

  size(): number {
    return this.store.size;
  }
}
