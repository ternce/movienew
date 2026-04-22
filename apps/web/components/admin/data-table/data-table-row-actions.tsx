'use client';

import { DotsThree } from '@phosphor-icons/react';
import * as React from 'react';
import { Row } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Action<TData> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: Row<TData>) => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  actions: Action<TData>[];
}

export function DataTableRowActions<TData>({
  row,
  actions,
}: DataTableRowActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-mp-surface"
        >
          <DotsThree className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => action.onClick(row)}
              className={cn(
                action.variant === 'destructive' &&
                  'text-mp-error-text focus:text-mp-error-text'
              )}
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
