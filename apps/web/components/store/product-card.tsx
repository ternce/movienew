'use client';

import { ShoppingCart, Package } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import { cn, formatPrice } from '@/lib/utils';

export interface ProductContent {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: number;
  bonusPrice?: number;
  stockQuantity: number;
  status: 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
}

interface ProductCardProps {
  product: ProductContent;
  onAddToCart?: (productId: string) => void;
  className?: string;
}

/**
 * Product card for the store
 * Vertical layout: image + info + price + add-to-cart button
 */
export const ProductCard = memo(function ProductCard({ product, onAddToCart, className }: ProductCardProps) {
  const isOutOfStock = product.stockQuantity === 0 || product.status === 'OUT_OF_STOCK';
  const safeImages = Array.isArray(product.images)
    ? product.images
    : typeof product.images === 'string'
      ? (() => { try { return JSON.parse(product.images); } catch { return []; } })()
      : [];
  const imageUrl = safeImages[0];

  return (
    <div
      className={cn(
        'group relative content-card rounded-xl border border-mp-border bg-mp-surface overflow-hidden',
        className
      )}
    >
      {/* Image */}
      <Link href={`/store/${product.slug}`} className="block">
        <div className="relative aspect-square bg-mp-surface-2 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-mp-text-disabled" />
            </div>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-sm font-medium text-white bg-mp-error-bg/80 px-3 py-1.5 rounded">
                Нет в наличии
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <Link href={`/store/${product.slug}`}>
          <h3 className="font-medium text-mp-text-primary line-clamp-2 group-hover:text-mp-accent-primary transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 space-y-1">
          <p className="text-lg font-bold text-mp-text-primary">
            {formatPrice(product.price)}
          </p>
          {product.bonusPrice && (
            <p className="text-sm text-mp-accent-secondary">
              или {formatPrice(product.bonusPrice, false)} бонусов
            </p>
          )}
        </div>

        {/* Add to cart - visible on hover (desktop) or always (mobile) */}
        <div className="mt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product.id);
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            {isOutOfStock ? 'Нет в наличии' : 'В корзину'}
          </Button>
        </div>
      </div>
    </div>
  );
});
