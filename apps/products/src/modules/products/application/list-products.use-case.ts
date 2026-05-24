import { Inject, Injectable } from '@nestjs/common';

import { Product } from '../domain/product';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../domain/product.repository';

export interface ListProductsInput {
  page: number;
  pageSize: number;
}

export interface ListProductsResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class ListProductsUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute(input: ListProductsInput): Promise<ListProductsResult> {
    const { page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const { items, total } = await this.products.list({ offset, limit: pageSize });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return { items, total, page, pageSize, totalPages };
  }
}
