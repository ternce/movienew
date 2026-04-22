'use client';

import { Minus, Plus, Trash, Package } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CartItemDto } from '@/types/store.types';

interface CartItemRowProps {
  item: CartItemDto;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  isUpdating?: boolean;
  compact?: boolean;
  className?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
  compact = false,
  className,
}: CartItemRowProps) {
  const imgSize = compact ? 48 : 64;

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3',
        !compact && 'py-4',
        className,
      )}
    >
      {/* Thumbnail */}
      <div
        className="shrink-0 rounded-lg overflow-hidden bg-mp-surface-elevated"
        style={{ width: imgSize, height: imgSize }}
      >
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            width={imgSize}
            height={imgSize}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-mp-text-disabled" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/store/${item.productSlug}`}
          className="text-sm font-medium text-mp-text-primary hover:text-mp-accent-primary transition-colors line-clamp-1"
        >
          {item.productName}
        </Link>

        <div className="text-sm text-mp-text-secondary mt-0.5">
          {formatPrice(item.price)} ₽
        </div>

        {!item.inStock && (
          <span className="text-xs text-mp-error-text mt-1 inline-block">
            Нет в наличии
          </span>
        )}

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center border border-mp-border rounded-lg">
            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="p-1.5 text-mp-text-secondary hover:text-mp-text-primary disabled:opacity-40 transition-colors"
              aria-label="Уменьшить количество"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium text-mp-text-primary">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
              disabled={isUpdating || item.quantity >= item.availableQuantity}
              className="p-1.5 text-mp-text-secondary hover:text-mp-text-primary disabled:opacity-40 transition-colors"
              aria-label="Увеличить количество"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-mp-text-disabled hover:text-mp-error-text"
            onClick={() => onRemove(item.productId)}
            disabled={isUpdating}
            aria-label="Удалить из корзины"
          >
            <Trash className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Total price */}
      <div className="text-sm font-semibold text-mp-text-primary shrink-0">
        {formatPrice(item.totalPrice)} ₽
      </div>
    </div>
  );
}
