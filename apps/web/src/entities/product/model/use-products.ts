'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginatedProductsResponse } from '@universe/contracts';

import { productsApi } from '../api';

import { productQueryKeys } from './query-keys';

export const useProducts = (page: number, pageSize: number) =>
  useQuery<PaginatedProductsResponse>({
    queryKey: productQueryKeys.list(page, pageSize),
    queryFn: () => productsApi.list(page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
