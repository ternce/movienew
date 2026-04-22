'use client';

import { ShoppingCart } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useCartSummary } from '@/hooks/use-store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface CartBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function CartBadge({ onClick, className }: CartBadgeProps) {
  const { isAuthenticated } = useAuthStore();
  const { data: summary } = useCartSummary();

  const count = summary?.itemCount ?? 0;

  if (!isAuthenticated) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn('relative text-mp-text-secondary hover:text-mp-text-primary', className)}
      aria-label={`Корзина${count > 0 ? `, ${count} товаров` : ''}`}
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-mp-accent-primary text-white text-[10px] font-bold px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
}
