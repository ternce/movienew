'use client';

import { Bag, Package } from '@phosphor-icons/react';
import Link from 'next/link';

import { ContentImage } from '@/components/content/content-image';
import { cn } from '@/lib/utils';
import { ProductStatus } from '@movie-platform/shared';

export interface ProductContent {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl?: string;
  price: number;
  bonusPrice?: number;
  status: ProductStatus;
}

interface ProductCardProps {
  content: ProductContent;
  onAddToCart?: (productId: string) => void;
  isAddingToCart?: boolean;
  className?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

/**
 * Product card for the store section
 * Features: hover zoom, price display, stock status badge, bonus price
 */
export function ProductCard({ content, onAddToCart, isAddingToCart, className }: ProductCardProps) {
  const isAvailable = content.status === ProductStatus.ACTIVE;

  const handleAddToCart = (e: React.MouseEvent) => {
    if (onAddToCart && isAvailable) {
      e.preventDefault();
      e.stopPropagation();
      onAddToCart(content.id);
    }
  };

  return (
    <Link
      href={`/store/${content.slug}`}
      className={cn(
        'group block shrink-0 content-card w-full',
        !isAvailable && 'opacity-60',
        className
      )}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        {/* Image with smooth zoom */}
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.name}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          fallbackIcon={<Package className="w-12 h-12 text-mp-text-disabled" />}
        />

        {/* Stock status badge */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded backdrop-blur-sm',
              isAvailable
                ? 'bg-mp-success-bg/80 text-mp-success-text'
                : 'bg-mp-error-bg/80 text-mp-error-text'
            )}
          >
            {isAvailable ? 'В наличии' : 'Нет в наличии'}
          </span>
        </div>

        {/* Gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Cart icon that scales in */}
        <div
          className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100"
          onClick={handleAddToCart}
        >
          <div className={cn(
            'w-14 h-14 touch:w-11 touch:h-11 rounded-full bg-mp-accent-primary/90 backdrop-blur-sm flex items-center justify-center shadow-glow-primary',
            isAddingToCart && 'opacity-60',
          )}>
            <Bag className={cn('w-6 h-6 touch:w-5 touch:h-5 text-white', isAddingToCart && 'animate-pulse')} />
          </div>
        </div>
      </div>

      {/* Content info */}
      <div>
        <h3 className="font-medium text-mp-text-primary truncate group-hover:text-mp-accent-primary transition-colors duration-200">
          {content.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base font-semibold text-mp-text-primary">
            {formatPrice(content.price)} ₽
          </span>
          {content.bonusPrice != null && content.bonusPrice > 0 && (
            <span className="text-sm text-mp-accent-secondary font-medium">
              или {formatPrice(content.bonusPrice)} бонусов
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
