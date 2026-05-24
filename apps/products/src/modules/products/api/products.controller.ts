import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  createProductDtoSchema,
  paginationQuerySchema,
  type CreateProductDto,
  type PaginatedProductsResponse,
  type PaginationQuery,
  type ProductResponse,
} from '@universe/contracts';

import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { CreateProductUseCase } from '../application/create-product.use-case';
import { DeleteProductUseCase } from '../application/delete-product.use-case';
import { ListProductsUseCase } from '../application/list-products.use-case';
import type { Product } from '../domain/product';

import { DomainExceptionFilter } from './domain-exception.filter';

const toResponse = (product: Product): ProductResponse => ({
  id: product.id,
  name: product.name,
  description: product.description,
  priceCents: product.price.toCents(),
  currency: product.price.getCurrency(),
  createdAt: product.createdAt.toISOString(),
});

@Controller('products')
@UseFilters(DomainExceptionFilter)
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly listProducts: ListProductsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createProductDtoSchema))
  async create(@Body() body: CreateProductDto): Promise<ProductResponse> {
    const product = await this.createProduct.execute({
      name: body.name,
      description: body.description,
      priceCents: body.priceCents,
      currency: body.currency,
    });
    return toResponse(product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteProduct.execute({ id });
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ): Promise<PaginatedProductsResponse> {
    const result = await this.listProducts.execute(query);
    return {
      items: result.items.map(toResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }
}
