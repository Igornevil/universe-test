'use client';

import { DEFAULT_PAGE_SIZE, type ProductResponse } from '@universe/contracts';
import { ArrowDown, Package } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useProducts } from '~/entities/product';
import { CreateProductDialog } from '~/features/create-product';
import { DeleteConfirmDialog } from '~/features/delete-product';
import { Pagination } from '~/shared/ui';
import { ProductsTable } from '~/widgets/products-table';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [pendingDelete, setPendingDelete] = useState<ProductResponse | null>(null);

  const { data, isLoading, isError, error, isFetching } = useProducts(page, pageSize);

  const setPage = useCallback(
    (next: number) => {
      const totalPages = Math.max(data?.totalPages ?? 1, 1);
      const safe = clamp(next, 1, totalPages);
      const params = new URLSearchParams(searchParams.toString());
      if (safe === 1) {
        params.delete('page');
      } else {
        params.set('page', String(safe));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [data?.totalPages, pathname, router, searchParams],
  );

  const total = data?.total ?? 0;

  return (
    <main className="container max-w-5xl py-12">
      <header className="mb-10 flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              {!isLoading && (
                <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {total}
                </span>
              )}
            </div>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Browse, create and delete products. Each change emits an event to the
            Notifications service for audit.
          </p>
        </div>
        <CreateProductDialog />
      </header>

      {isError ? (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load products: {error?.message ?? 'Unknown error'}
        </div>
      ) : null}

      <div className="space-y-4" aria-busy={isFetching}>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
            Sorted by newest first
          </span>
          {isFetching && !isLoading ? (
            <span className="text-xs text-muted-foreground/80">Refreshing…</span>
          ) : null}
        </div>

        <ProductsTable
          products={data?.items ?? []}
          isLoading={isLoading}
          onDelete={(product) => setPendingDelete(product)}
        />

        <Pagination
          page={data?.page ?? page}
          pageSize={data?.pageSize ?? pageSize}
          total={total}
          totalPages={data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </div>

      <DeleteConfirmDialog product={pendingDelete} onClose={() => setPendingDelete(null)} />
    </main>
  );
}
