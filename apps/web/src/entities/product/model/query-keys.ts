export const productQueryKeys = {
  all: ['products'] as const,
  list: (page: number, pageSize: number) => ['products', 'list', { page, pageSize }] as const,
};
