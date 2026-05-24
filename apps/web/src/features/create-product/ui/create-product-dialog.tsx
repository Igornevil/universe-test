'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { parsePriceToCents } from '@universe/contracts';
import { Loader2, PackagePlus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '~/shared/api';
import { cn } from '~/shared/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from '~/shared/ui';

import { useCreateProduct } from '../model';

const NAME_MAX = 255;
const DESCRIPTION_MAX = 2000;

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(NAME_MAX),
  description: z.string().trim().max(DESCRIPTION_MAX),
  price: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .refine((value) => parsePriceToCents(value) !== null, {
      message: 'Use a decimal like "19.99"',
    }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateProduct();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', price: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const priceCents = parsePriceToCents(values.price);
    if (priceCents === null) {
      form.setError('price', { message: 'Invalid price' });
      return;
    }

    try {
      const created = await mutation.mutateAsync({
        name: values.name,
        description: values.description,
        priceCents,
        currency: 'USD',
      });
      toast.success(`Created "${created.name}"`);
      form.reset();
      setOpen(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create product';
      toast.error(message);
    }
  });

  const handleOpenChange = (next: boolean) => {
    if (!next && mutation.isPending) return;
    setOpen(next);
    if (!next) form.reset();
  };

  const descriptionLength = form.watch('description')?.length ?? 0;
  const nameError = form.formState.errors.name?.message;
  const descriptionError = form.formState.errors.description?.message;
  const priceError = form.formState.errors.price?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-sm">
          <Plus className="h-4 w-4" /> Create Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <DialogHeader className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl">New product</DialogTitle>
              <DialogDescription>
                Add a product to the catalogue. A{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  product.created
                </code>{' '}
                event will be emitted to subscribers.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <Field
              id="name"
              label="Name"
              required
              error={nameError}
              hint="Public, shown in product lists"
            >
              <Input
                id="name"
                autoFocus
                placeholder="e.g. Wireless Headphones"
                maxLength={NAME_MAX}
                aria-invalid={Boolean(nameError)}
                {...form.register('name')}
              />
            </Field>

            <Field
              id="description"
              label="Description"
              error={descriptionError}
              hint={
                <span className="flex items-center justify-between">
                  <span>Optional, max {DESCRIPTION_MAX} characters</span>
                  <span
                    className={cn(
                      'tabular-nums text-xs',
                      descriptionLength > DESCRIPTION_MAX * 0.9 && 'text-amber-600',
                      descriptionLength > DESCRIPTION_MAX && 'text-destructive',
                    )}
                  >
                    {descriptionLength}/{DESCRIPTION_MAX}
                  </span>
                </span>
              }
            >
              <Textarea
                id="description"
                rows={4}
                placeholder="Add context, materials, dimensions, anything useful…"
                maxLength={DESCRIPTION_MAX}
                aria-invalid={Boolean(descriptionError)}
                {...form.register('description')}
              />
            </Field>

            <Field
              id="price"
              label="Price"
              required
              error={priceError}
              hint='Decimal in USD, e.g. "19.99"'
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="19.99"
                  className="pl-7 tabular-nums"
                  aria-invalid={Boolean(priceError)}
                  {...form.register('price')}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                  USD
                </span>
              </div>
            </Field>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="min-w-[120px]">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                'Create product'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ id, label, required, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1 text-sm">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
