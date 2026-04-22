'use client';

import { X } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { StoreCategoryDto } from '@/types/store.types';

interface StoreFiltersProps {
  categories: StoreCategoryDto[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  className?: string;
}

export function StoreFilters({
  categories,
  selectedCategories,
  onCategoryToggle,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  inStockOnly,
  onInStockChange,
  onClearAll,
  hasActiveFilters,
  className,
}: StoreFiltersProps) {
  return (
    <aside className={cn('w-64 shrink-0 space-y-6', className)}>
      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-mp-text-primary mb-3">Категории</h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedCategories.includes(cat.id)}
                  onCheckedChange={() => onCategoryToggle(cat.id)}
                />
                <span className="text-sm text-mp-text-secondary">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="text-sm font-medium text-mp-text-primary mb-3">Цена</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="от"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="text-sm"
            min={0}
          />
          <span className="text-mp-text-disabled">—</span>
          <Input
            type="number"
            placeholder="до"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="text-sm"
            min={0}
          />
        </div>
      </div>

      {/* In stock toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-mp-text-secondary">Только в наличии</span>
        <Switch checked={inStockOnly} onCheckedChange={onInStockChange} />
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="w-full gap-2"
        >
          <X className="w-4 h-4" />
          Сбросить фильтры
        </Button>
      )}
    </aside>
  );
}
