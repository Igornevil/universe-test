'use client';

import type { ProductResponse } from '@universe/contracts';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '~/shared/api';
import { formatPrice } from '~/shared/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/shared/ui';

import { useDeleteProduct } from '../model';

interface DeleteConfirmDialogProps {
  product: ProductResponse | null;
  onClose: () => void;
}

export function DeleteConfirmDialog({ product, onClose }: DeleteConfirmDialogProps) {
  const mutation = useDeleteProduct();

  const handleConfirm = async () => {
    if (!product) return;
    try {
      await mutation.mutateAsync(product.id);
      toast.success(`Deleted "${product.name}"`);
      onClose();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to delete product';
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={product !== null}
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl">Delete product</DialogTitle>
            <DialogDescription>
              This action is permanent and emits a{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                product.deleted
              </code>{' '}
              event. The record cannot be restored.
            </DialogDescription>
          </div>
        </DialogHeader>

        {product ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                {product.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {product.description}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatPrice(product.priceCents, product.currency)}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="min-w-[120px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
