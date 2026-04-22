'use client';

import { X, MagnifyingGlass, SlidersHorizontal } from '@phosphor-icons/react';
import * as React from 'react';
import { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { DataTableFacetedFilter } from './data-table-faceted-filter';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  onSearch?: (value: string) => void;
}

interface FilterOption {
  id: string;
  title: string;
  options: { label: string; value: string }[];
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  onSearch,
}: DataTableToolbarProps<TData>) {
  const [searchValue, setSearchValue] = React.useState('');
  const isFiltered = table.getState().columnFilters.length > 0;

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (onSearch) {
      onSearch(value);
    } else if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(value);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Left side - Search and Filters */}
      <div className="flex flex-1 flex-wrap items-center gap-2 w-full sm:w-auto">
        {/* Search input */}
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mp-text-disabled" />
            <input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-mp-surface border border-mp-border rounded-lg text-sm text-mp-text-primary placeholder:text-mp-text-disabled focus:outline-none focus:ring-2 focus:ring-mp-accent-primary/50 focus:border-mp-accent-primary transition-all"
            />
          </div>
        )}

        {/* Faceted filters */}
        {filterOptions.map((filter) => {
          const column = table.getColumn(filter.id);
          if (column) {
            return (
              <DataTableFacetedFilter
                key={filter.id}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            );
          }
          return null;
        })}

        {/* Reset filters button */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right side - Column visibility */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 ml-auto">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Столбцы
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuLabel>Видимые столбцы</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== 'undefined' && column.getCanHide()
            )
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
