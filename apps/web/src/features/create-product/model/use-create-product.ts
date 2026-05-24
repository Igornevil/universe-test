'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateProductDto, ProductResponse } from '@universe/contracts';

import { productQueryKeys, productsApi } from '~/entities/product';

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<ProductResponse, Error, CreateProductDto>({
    mutationFn: (dto) => productsApi.create(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
};
