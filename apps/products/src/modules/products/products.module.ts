import { Module } from '@nestjs/common';

import { ProductsController } from './api/products.controller';
import { CreateProductUseCase } from './application/create-product.use-case';
import { DeleteProductUseCase } from './application/delete-product.use-case';
import { EVENT_PUBLISHER } from './application/event-publisher';
import { ListProductsUseCase } from './application/list-products.use-case';
import { PRODUCT_REPOSITORY } from './domain/product.repository';
import { ProductEventsPublisher } from './infrastructure/product-events.publisher';
import { DrizzleProductRepository } from './infrastructure/product.repository';

/**
 * Products feature module. Self-contained: owns its domain, use cases,
 * Drizzle repository, RMQ publisher and HTTP controller. Depends only on
 * the generic `DatabaseModule` (postgres client) and `MessagingModule`
 * (AMQP connection), both registered globally by AppModule.
 */
@Module({
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    DeleteProductUseCase,
    ListProductsUseCase,
    DrizzleProductRepository,
    { provide: PRODUCT_REPOSITORY, useExisting: DrizzleProductRepository },
    ProductEventsPublisher,
    { provide: EVENT_PUBLISHER, useExisting: ProductEventsPublisher },
  ],
})
export class ProductsModule {}
