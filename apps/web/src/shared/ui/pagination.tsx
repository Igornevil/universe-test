'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '~/shared/lib';

import { Button } from './button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** How many numbered buttons to render around the current page. Default 1. */
  siblingCount?: number;
}

const ELLIPSIS = '…';

/** Compact numbered pagination: `< 1 … 4 [5] 6 … 12 >`. */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  const firstIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastIndex = Math.min(page * pageSize, total);
  const items = buildPageItems(page, Math.max(totalPages, 1), siblingCount);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? 'No items' : `Showing ${firstIndex}–${lastIndex} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {items.map((item, index) =>
          item === ELLIPSIS ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-muted-foreground"
              aria-hidden="true"
            >
              {ELLIPSIS}
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'default' : 'outline'}
              size="icon"
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn('min-w-9', item === page && 'pointer-events-none')}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || total === 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Builds the visible page numbers. Always includes first/last, the current
 * page, and `siblingCount` neighbours; collapses everything else into `…`.
 *
 * Examples (siblingCount = 1):
 *   total 5,  current 3 → [1, 2, 3, 4, 5]
 *   total 10, current 1 → [1, 2, 3, …, 10]
 *   total 10, current 5 → [1, …, 4, 5, 6, …, 10]
 *   total 10, current 9 → [1, …, 8, 9, 10]
 */
function buildPageItems(
  current: number,
  total: number,
  siblingCount: number,
): readonly (number | typeof ELLIPSIS)[] {
  const totalNumbers = siblingCount * 2 + 5; // first + last + current + siblings + 2 ellipses
  if (total <= totalNumbers) {
    return range(1, total);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, 3 + siblingCount * 2), ELLIPSIS, total];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, ELLIPSIS, ...range(total - (2 + siblingCount * 2) + 1, total)];
  }

  return [1, ELLIPSIS, ...range(leftSibling, rightSibling), ELLIPSIS, total];
}

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i);
}
