'use client';

import { Package, SlidersHorizontal, MagnifyingGlass } from '@phosphor-icons/react';
import * as React from 'react';

import { ProductCard, type ProductContent } from '@/components/content';
import { ProductCardSkeletonGrid, StoreFilters } from '@/components/store';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useStoreProducts, useStoreCategories, useAddToCart } from '@/hooks/use-store';
import { ProductStatus } from '@movie-platform/shared';
import type { ProductQueryParams } from '@/types/store.types';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Сначала новые' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
  { value: 'popularity', label: 'По популярности' },
  { value: 'name', label: 'По названию' },
];

export default function StorePage() {
  const [showFilters, setShowFilters] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortValue, setSortValue] = React.useState('createdAt');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');
  const [inStockOnly, setInStockOnly] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Parse sort value into sortBy + sortOrder
  const sortBy = sortValue.replace(/_asc|_desc/, '') as ProductQueryParams['sortBy'];
  const sortOrder = sortValue.endsWith('_desc') ? 'desc' as const : sortValue.endsWith('_asc') ? 'asc' as const : undefined;

  const params: ProductQueryParams = {
    page: currentPage,
    limit: 12,
    sortBy,
    sortOrder,
    search: debouncedSearch || undefined,
    categoryId: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
    inStock: inStockOnly || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  };

  const { data, isLoading } = useStoreProducts(params);
  const { data: categories } = useStoreCategories();
  const { mutate: addToCart, isPending: isAdding } = useAddToCart();

  const products = React.useMemo(() => {
    const items = data?.items ?? [];
    return items.map((item): ProductContent => {
      const images = Array.isArray(item.images)
        ? item.images
        : typeof item.images === 'string'
          ? (() => { try { return JSON.parse(item.images); } catch { return []; } })()
          : [];
      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        thumbnailUrl: images[0],
        price: item.price,
        bonusPrice: item.bonusPrice,
        status: item.status,
      };
    });
  }, [data]);

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || minPrice !== '' || maxPrice !== '' || inStockOnly || searchQuery !== '';

  const handleAddToCart = (productId: string) => {
    addToCart({ productId, quantity: 1 });
  };

  return (
    <Container size="full" className="py-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mp-text-primary">Магазин</h1>
          <p className="text-sm text-mp-text-secondary mt-1">
            {total} {total === 1 ? 'товар' : total < 5 ? 'товара' : 'товаров'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-text-disabled" />
            <Input
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 w-[200px]"
            />
          </div>

          <Select value={sortValue} onValueChange={(v) => { setSortValue(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-mp-accent-primary rounded-full text-white">
                {selectedCategories.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (inStockOnly ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden mb-4">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-text-disabled" />
          <Input
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Mobile: Sheet overlay (do not mount on desktop to avoid invisible overlays blocking clicks) */}
      <div className="md:hidden">
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <StoreFilters
                categories={categories ?? []}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPriceChange={(v) => { setMinPrice(v); setCurrentPage(1); }}
                onMaxPriceChange={(v) => { setMaxPrice(v); setCurrentPage(1); }}
                inStockOnly={inStockOnly}
                onInStockChange={(v) => { setInStockOnly(v); setCurrentPage(1); }}
                onClearAll={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        {/* Desktop: inline aside */}
        {showFilters && (
          <StoreFilters
            categories={categories ?? []}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={(v) => { setMinPrice(v); setCurrentPage(1); }}
            onMaxPriceChange={(v) => { setMaxPrice(v); setCurrentPage(1); }}
            inStockOnly={inStockOnly}
            onInStockChange={(v) => { setInStockOnly(v); setCurrentPage(1); }}
            onClearAll={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            className="hidden md:block"
          />
        )}

        {/* Content grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <ProductCardSkeletonGrid count={12} columns={showFilters ? 3 : 4} />
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-mp-text-disabled mb-4" />
              <h3 className="text-lg font-medium text-mp-text-primary mb-2">
                Товары не найдены
              </h3>
              <p className="text-mp-text-secondary mb-4">
                Попробуйте изменить параметры поиска или фильтрации
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className={`grid gap-4 md:gap-6 grid-cols-2 ${showFilters ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4'}`}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    content={product}
                    onAddToCart={handleAddToCart}
                    isAddingToCart={isAdding}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
