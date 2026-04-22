'use client';

import * as React from 'react';
import { CaretLeft, CaretRight, DotsThree } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  className?: string;
}

function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const totalPageNumbers = siblingCount * 2 + 5; // siblings + current + first + last + 2 ellipsis

  // If total pages is less than the page numbers we want to show
  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const paginationRange = generatePaginationRange(currentPage, totalPages, siblingCount);

  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Навигация по страницам"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {/* Previous button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Предыдущая страница"
        className="h-9 w-9"
      >
        <CaretLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {paginationRange.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 w-9 items-center justify-center text-mp-text-secondary"
                aria-hidden="true"
              >
                <DotsThree className="h-4 w-4" />
              </span>
            );
          }

          const isActive = currentPage === page;

          return (
            <Button
              key={page}
              variant={isActive ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onPageChange(page)}
              aria-label={`Страница ${page}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'h-9 w-9',
                isActive && 'bg-mp-accent-primary hover:bg-mp-accent-primary/90'
              )}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Следующая страница"
        className="h-9 w-9"
      >
        <CaretRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

// Compact pagination for mobile
export function PaginationCompact({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: Omit<PaginationProps, 'siblingCount' | 'showFirstLast'>) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <CaretLeft className="mr-1 h-4 w-4" />
        Назад
      </Button>

      <span className="text-sm text-mp-text-secondary">
        {currentPage} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Вперёд
        <CaretRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
