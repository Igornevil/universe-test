import type { Product } from './product';

export const PRODUCT_REPOSITORY = 'ProductRepository';

export interface ListPageQuery {
  offset: number;
  limit: number;
}

export interface ListPage {
  items: Product[];
  total: number;
}

/**
 * Persistence port for Product aggregates. Implementations live in the
 * infrastructure layer; the domain depends only on this interface.
 */
export interface ProductRepository {
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Product | null>;
  list(query: ListPageQuery): Promise<ListPage>;
}
