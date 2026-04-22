'use client';

import { CaretRight, House } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Breadcrumb item configuration
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Route to label mapping for admin pages
 */
const routeLabels: Record<string, string> = {
  admin: 'Админ',
  dashboard: 'Дашборд',
  users: 'Пользователи',
  verifications: 'Верификации',
  content: 'Контент',
  subscriptions: 'Подписки',
  plans: 'Тарифы',
  partners: 'Партнёры',
  withdrawals: 'Выводы',
  store: 'Магазин',
  products: 'Товары',
  orders: 'Заказы',
  inventory: 'Склад',
  categories: 'Категории',
  payments: 'Платежи',
  newsletters: 'Рассылки',
  documents: 'Документы',
  bonuses: 'Бонусы',
  campaigns: 'Кампании',
  rates: 'Ставки',
  commissions: 'Комиссии',
  reports: 'Отчёты',
  audit: 'Журнал аудита',
  settings: 'Настройки',
  new: 'Создание',
  edit: 'Редактирование',
};

interface AdminBreadcrumbsProps {
  className?: string;
  customItems?: BreadcrumbItem[];
}

/**
 * Admin breadcrumbs component for navigation context
 */
export function AdminBreadcrumbs({ className, customItems }: AdminBreadcrumbsProps) {
  const pathname = usePathname();

  const breadcrumbs = React.useMemo<BreadcrumbItem[]>(() => {
    if (customItems) return customItems;

    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip UUID-like segments but mark as dynamic item
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

      if (isUuid) {
        items.push({
          label: 'Детали',
          href: index === segments.length - 1 ? undefined : currentPath,
        });
      } else {
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        items.push({
          label,
          href: index === segments.length - 1 ? undefined : currentPath,
        });
      }
    });

    return items;
  }, [pathname, customItems]);

  // Don't render if only one item
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)}>
      <Link
        href="/admin/dashboard"
        className="p-1 text-mp-text-disabled hover:text-mp-text-secondary transition-colors"
      >
        <House className="w-4 h-4" />
      </Link>

      {breadcrumbs.slice(1).map((item, index) => (
        <React.Fragment key={index}>
          <CaretRight className="w-4 h-4 text-mp-text-disabled" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-mp-text-secondary hover:text-mp-text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-mp-text-primary font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
