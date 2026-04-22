'use client';

import * as React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { flexRender, type Row } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataTableCardViewProps<TData> {
  rows: Row<TData>[];
  isLoading?: boolean;
}

/**
 * Mobile card view for admin data tables
 * Renders each row as a stacked card with expandable details
 */
export function DataTableCardView<TData>({
  rows,
  isLoading = false,
}: DataTableCardViewProps<TData>) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-mp-border bg-mp-bg-secondary p-4 animate-pulse">
            <div className="h-5 w-3/4 bg-mp-surface rounded mb-2" />
            <div className="h-4 w-1/2 bg-mp-surface rounded mb-3" />
            <div className="h-4 w-1/3 bg-mp-surface rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-mp-border bg-mp-bg-secondary p-8 text-center text-mp-text-secondary">
        No results found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isExpanded = expandedRows.has(row.id);
        const cells = row.getVisibleCells();

        // Show first 3 columns as preview, rest when expanded
        const previewCells = cells.slice(0, 3);
        const detailCells = cells.slice(3);

        return (
          <div
            key={row.id}
            className={cn(
              'rounded-lg border border-mp-border bg-mp-bg-secondary overflow-hidden transition-colors',
              row.getIsSelected() && 'border-mp-accent-primary/50 bg-mp-accent-primary/5'
            )}
          >
            {/* Card header - preview fields */}
            <div className="p-4">
              <div className="space-y-1.5">
                {previewCells.map((cell) => {
                  const header = cell.column.columnDef.header;
                  const headerText = typeof header === 'string' ? header : cell.column.id;

                  return (
                    <div key={cell.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-mp-text-disabled uppercase tracking-wider shrink-0">
                        {headerText}
                      </span>
                      <span className="text-sm text-mp-text-primary text-right truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Expand/collapse button */}
              {detailCells.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRow(row.id)}
                  className="w-full mt-3 gap-1 text-mp-text-secondary"
                >
                  {isExpanded ? 'Скрыть' : 'Подробнее'}
                  <CaretDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                </Button>
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && detailCells.length > 0 && (
              <div className="border-t border-mp-border px-4 py-3 bg-mp-surface/30 space-y-1.5">
                {detailCells.map((cell) => {
                  const header = cell.column.columnDef.header;
                  const headerText = typeof header === 'string' ? header : cell.column.id;

                  return (
                    <div key={cell.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-mp-text-disabled uppercase tracking-wider shrink-0">
                        {headerText}
                      </span>
                      <span className="text-sm text-mp-text-primary text-right truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
