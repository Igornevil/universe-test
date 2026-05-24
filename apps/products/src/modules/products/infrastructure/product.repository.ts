import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

import { DATABASE_CLIENT } from '../../../shared/database/database.module';
import { Product } from '../domain/product';
import type { ListPage, ListPageQuery, ProductRepository } from '../domain/product.repository';

import { products } from './schema';

type ProductsDatabase = PostgresJsDatabase<{ products: typeof products }>;

@Injectable()
export class DrizzleProductRepository implements ProductRepository {
  private readonly db: ProductsDatabase;

  constructor(@Inject(DATABASE_CLIENT) client: Sql) {
    this.db = drizzle(client, { schema: { products } });
  }

  async save(product: Product): Promise<void> {
    await this.db
      .insert(products)
      .values({
        id: product.id,
        name: product.name,
        description: product.description,
        priceCents: product.price.toCents(),
        currency: product.price.getCurrency(),
        createdAt: product.createdAt,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          name: product.name,
          description: product.description,
          priceCents: product.price.toCents(),
          currency: product.price.getCurrency(),
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  async findById(id: string): Promise<Product | null> {
    const rows = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toEntity(row) : null;
  }

  async list(query: ListPageQuery): Promise<ListPage> {
    const [items, [countRow]] = await Promise.all([
      this.db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: sql<number>`count(*)::int` }).from(products),
    ]);

    return {
      items: items.map((row) => this.toEntity(row)),
      total: countRow?.value ?? 0,
    };
  }

  private toEntity(row: typeof products.$inferSelect): Product {
    return Product.restore({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: row.priceCents,
      currency: row.currency as 'USD',
      createdAt: row.createdAt,
    });
  }
}
