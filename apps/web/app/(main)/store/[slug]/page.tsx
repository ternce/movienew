'use client';

import { ArrowLeft, Minus, Plus, ShoppingCart } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { ProductCard, type ProductContent } from '@/components/content';
import { ProductImageGallery } from '@/components/store';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoreProduct, useStoreProducts, useAddToCart } from '@/hooks/use-store';
import { ProductStatus } from '@movie-platform/shared';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [quantity, setQuantity] = React.useState(1);

  const { data: product, isLoading, error } = useStoreProduct(slug);
  const { mutate: addToCart, isPending: isAdding } = useAddToCart();

  // Related products
  const { data: relatedData } = useStoreProducts(
    product
      ? { categoryId: product.category?.id, limit: 4 }
      : undefined,
  );

  const relatedProducts = React.useMemo(() => {
    if (!relatedData?.items || !product) return [];
    return relatedData.items
      .filter((p) => p.id !== product.id)
      .slice(0, 4)
      .map((item): ProductContent => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        thumbnailUrl: Array.isArray(item.images) ? item.images[0] : undefined,
        price: item.price,
        bonusPrice: item.bonusPrice,
        status: item.status,
      }));
  }, [relatedData, product]);

  const isAvailable = product?.status === ProductStatus.ACTIVE && (product?.stockQuantity ?? 0) > 0;
  const maxQty = product?.stockQuantity ?? 1;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({ productId: product.id, quantity });
  };

  if (error) {
    return (
      <Container size="lg" className="py-12 text-center">
        <h1 className="text-xl font-bold text-mp-text-primary mb-2">Товар не найден</h1>
        <p className="text-mp-text-secondary mb-4">Возможно, он был удалён или перемещён.</p>
        <Button variant="outline" asChild>
          <Link href="/store">Вернуться в магазин</Link>
        </Button>
      </Container>
    );
  }

  if (isLoading || !product) {
    return null; // loading.tsx handles this
  }

  return (
    <Container size="lg" className="py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-mp-text-secondary mb-6">
        <Link href="/store" className="hover:text-mp-text-primary transition-colors">
          Магазин
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <span>{product.category.name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-mp-text-primary truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left — Image gallery */}
        <ProductImageGallery images={Array.isArray(product.images) ? product.images : []} productName={product.name} />

        {/* Right — Product info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-mp-text-primary mb-2">
              {product.name}
            </h1>
            {product.category && (
              <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-mp-surface text-mp-text-secondary">
                {product.category.name}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="text-3xl font-bold text-mp-text-primary">
              {formatPrice(product.price)} ₽
            </div>
            {product.bonusPrice != null && product.bonusPrice > 0 && (
              <div className="text-base text-mp-accent-secondary font-medium">
                или {formatPrice(product.bonusPrice)} бонусов
              </div>
            )}
          </div>

          {/* Stock status */}
          <div>
            {isAvailable ? (
              <span className="text-sm text-mp-success-text">
                В наличии ({product.stockQuantity} шт.)
              </span>
            ) : (
              <span className="text-sm text-mp-error-text">Нет в наличии</span>
            )}
          </div>

          {/* Quantity selector + Add to cart */}
          {isAvailable && (
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-mp-border rounded-lg">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="p-2.5 text-mp-text-secondary hover:text-mp-text-primary disabled:opacity-40 transition-colors"
                  aria-label="Уменьшить"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-medium text-mp-text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="p-2.5 text-mp-text-secondary hover:text-mp-text-primary disabled:opacity-40 transition-colors"
                  aria-label="Увеличить"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                variant="gradient"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                <ShoppingCart className="w-4 h-4" />
                {isAdding ? 'Добавляем...' : 'Добавить в корзину'}
              </Button>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h2 className="text-base font-semibold text-mp-text-primary mb-2">Описание</h2>
              <p className="text-sm text-mp-text-secondary leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-mp-text-primary mb-4">Похожие товары</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} content={rp} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
