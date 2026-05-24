import { z } from 'zod';

import { paginatedResponseSchema } from './pagination.js';

/**
 * Money is transferred over the wire as integer cents to avoid floating-point
 * ambiguity. The frontend is responsible for converting display strings
 * ("19.99") to cents (1999) before submitting.
 */
export const PRICE_MIN_CENTS = 0;
export const PRICE_MAX_CENTS = 1_000_000_000; // 10M dollars — sanity cap
export const SUPPORTED_CURRENCIES = ['USD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const createProductDtoSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).default(''),
  priceCents: z.number().int().min(PRICE_MIN_CENTS).max(PRICE_MAX_CENTS),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
});

export type CreateProductDto = z.infer<typeof createProductDtoSchema>;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int().nonnegative(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  createdAt: z.string().datetime({ offset: true }),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;

export const paginatedProductsResponseSchema = paginatedResponseSchema(productResponseSchema);
export type PaginatedProductsResponse = z.infer<typeof paginatedProductsResponseSchema>;
