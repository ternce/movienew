'use client';

import { Check as CheckIcon, PlusCircle } from '@phosphor-icons/react';
import * as React from 'react';
import { Column } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <p className="px-2 py-1.5 text-sm font-medium text-mp-text-secondary">
            Filter by {title}
          </p>
        </div>
        <Separator />
        <div className="p-2 space-y-1">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);
            return (
              <button
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    selectedValues.delete(option.value);
                  } else {
                    selectedValues.add(option.value);
                  }
                  const filterValues = Array.from(selectedValues);
                  column?.setFilterValue(
                    filterValues.length ? filterValues : undefined
                  );
                }}
                className={cn(
                  'flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-mp-accent-primary/10 text-mp-accent-primary'
                    : 'hover:bg-mp-surface text-mp-text-primary'
                )}
              >
                <div
                  className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                    isSelected
                      ? 'border-mp-accent-primary bg-mp-accent-primary'
                      : 'border-mp-border opacity-50'
                  )}
                >
                  {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                </div>
                {option.icon && (
                  <option.icon className="mr-2 h-4 w-4 text-mp-text-secondary" />
                )}
                <span>{option.label}</span>
                {facets?.get(option.value) && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center text-xs text-mp-text-disabled">
                    {facets.get(option.value)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedValues.size > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                onClick={() => column?.setFilterValue(undefined)}
                className="w-full justify-center text-sm"
              >
                Clear filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
