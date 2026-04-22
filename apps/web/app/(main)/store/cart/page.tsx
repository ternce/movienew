'use client';

import { Bag, ArrowLeft, Warning } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { CartItemRow } from '@/components/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { useCart, useUpdateCartItem, useRemoveFromCart, useClearCart } from '@/hooks/use-store';
import { useAuthStore } from '@/stores/auth.store';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();

  const { data: cart, isLoading } = useCart();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateCartItem();
  const { mutate: removeItem } = useRemoveFromCart();
  const { mutate: clearCart } = useClearCart();

  // Auth guard
  React.useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login?returnUrl=/store/cart');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;
  const hasOutOfStock = items.some((item) => !item.inStock);

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    updateItem({ productId, quantity });
  };

  const handleRemove = (productId: string) => {
    removeItem(productId);
  };

  if (isLoading) return null; // loading.tsx handles this

  return (
    <Container size="lg" className="py-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/store">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад в магазин
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-mp-text-primary">Корзина</h1>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-mp-surface flex items-center justify-center mb-4">
            <Bag className="w-8 h-8 text-mp-text-disabled" />
          </div>
          <h3 className="text-lg font-medium text-mp-text-primary mb-2">Корзина пуста</h3>
          <p className="text-mp-text-secondary mb-4">Добавьте товары из магазина</p>
          <Button variant="outline" asChild>
            <Link href="/store">Перейти в магазин</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2">
            {hasOutOfStock && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                <Warning className="w-4 h-4 shrink-0" />
                <span className="text-sm">Некоторые товары недоступны для заказа</span>
              </div>
            )}

            <div className="divide-y divide-mp-border">
              {items.map((item) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                  isUpdating={isUpdating}
                />
              ))}
            </div>

            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-mp-text-secondary"
                onClick={() => clearCart()}
              >
                Очистить корзину
              </Button>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Итого</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mp-text-secondary">
                    Товары ({cart?.totalQuantity ?? 0})
                  </span>
                  <span className="text-mp-text-primary font-medium">
                    {formatPrice(cart?.totalAmount ?? 0)} ₽
                  </span>
                </div>

                <div className="border-t border-mp-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-mp-text-primary">Итого</span>
                    <span className="text-xl font-bold text-mp-text-primary">
                      {formatPrice(cart?.totalAmount ?? 0)} ₽
                    </span>
                  </div>
                </div>

                <Button
                  variant="gradient"
                  className="w-full"
                  asChild
                >
                  <Link href="/store/checkout">Оформить заказ</Link>
                </Button>

                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/store">Продолжить покупки</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Container>
  );
}
