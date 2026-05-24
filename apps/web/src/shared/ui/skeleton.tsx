import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
