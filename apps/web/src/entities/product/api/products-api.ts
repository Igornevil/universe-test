import {
  paginatedProductsResponseSchema,
  productResponseSchema,
  type CreateProductDto,
  type PaginatedProductsResponse,
  type ProductResponse,
} from '@universe/contracts';

import { httpRequest } from '~/shared/api';

export const productsApi = {
  async list(page: number, pageSize: number): Promise<PaginatedProductsResponse> {
    const response = await httpRequest(`/products?page=${page}&pageSize=${pageSize}`);
    return paginatedProductsResponseSchema.parse(await response.json());
  },

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const response = await httpRequest('/products', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return productResponseSchema.parse(await response.json());
  },

  async remove(id: string): Promise<void> {
    await httpRequest(`/products/${id}`, { method: 'DELETE' });
  },
};
