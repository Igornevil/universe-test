'use client';

import type { ProductResponse } from '@universe/contracts';
import { PackageOpen, Trash2 } from 'lucide-react';

import { formatDate, formatPrice } from '~/shared/lib';
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/shared/ui';

interface ProductsTableProps {
  products: ProductResponse[];
  onDelete: (product: ProductResponse) => void;
  isLoading?: boolean;
  skeletonRows?: number;
}

export function ProductsTable({
  products,
  onDelete,
  isLoading = false,
  skeletonRows = 8,
}: ProductsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <ProductsTableHeader />
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-64" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-3">
          <PackageOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground">
            Click <strong>Create Product</strong> to add the first one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <ProductsTableHeader />
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className="group">
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="max-w-sm truncate text-muted-foreground">
                {product.description || '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPrice(product.priceCents, product.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(product.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${product.name}`}
                  className="opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProductsTableHeader() {
  return (
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Description</TableHead>
      <TableHead className="w-28 text-right">Price</TableHead>
      <TableHead className="w-44">Created</TableHead>
      <TableHead className="w-16" />
    </TableRow>
  );
}
