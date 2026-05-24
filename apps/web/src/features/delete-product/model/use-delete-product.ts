'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { productQueryKeys, productsApi } from '~/entities/product';

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
};
