'use client';

import { CaretUpDown, Check, X } from '@phosphor-icons/react';
import * as React from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============ Types ============

interface Category {
  id: string;
  name: string;
  slug: string;
  depth: number;
  parentId: string | null;
  children: unknown[];
}

interface CategorySelectProps {
  value: string;
  onChange: (id: string) => void;
  categories: Category[];
  placeholder?: string;
  disabled?: boolean;
}

// ============ Component ============

export function CategorySelect({
  value,
  onChange,
  categories,
  placeholder = 'Выберите категорию',
  disabled = false,
}: CategorySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCategory = React.useMemo(
    () => categories.find((cat) => cat.id === value),
    [categories, value]
  );

  const handleSelect = React.useCallback(
    (categoryId: string) => {
      onChange(categoryId);
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-mp-border bg-mp-surface/50 px-3 py-1 text-sm shadow-sm transition-colors',
            'hover:bg-mp-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selectedCategory ? 'text-mp-text-primary' : 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {selectedCategory ? selectedCategory.name : placeholder}
          </span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="rounded-sm p-0.5 text-mp-text-secondary hover:text-mp-text-primary hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <CaretUpDown className="h-4 w-4 text-mp-text-secondary" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск категории..." />
          <CommandList>
            <CommandEmpty>Нет категорий</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelect(category.id)}
                  style={{ paddingLeft: `${8 + category.depth * 16}px` }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === category.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{category.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
