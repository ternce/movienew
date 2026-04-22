'use client';

import { SquaresFour, Plus } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const STUDIO_NAV = [
  { href: '/studio', icon: SquaresFour, label: 'Мой контент', exact: true },
  { href: '/studio/create', icon: Plus, label: 'Создать' },
];

/**
 * Studio sidebar — desktop only (hidden below lg)
 */
export function StudioSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-1">
        <div className="px-3 mb-3">
          <span className="text-xs font-medium text-mp-text-secondary tracking-wider uppercase">
            Студия
          </span>
        </div>
        <nav className="space-y-1">
          {STUDIO_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-mp-accent-primary/10 text-mp-accent-primary'
                    : 'text-mp-text-secondary hover:bg-mp-surface/80 hover:text-mp-text-primary'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/**
 * Studio mobile tabs — horizontal scrolling tabs (shown below lg)
 */
export function StudioMobileTabs() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden -mx-4 sm:-mx-6 mb-6 overflow-x-auto border-b border-mp-border">
      <div className="flex min-w-max gap-1 px-4 sm:px-6 pb-2">
        {STUDIO_NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-mp-accent-primary/10 text-mp-accent-primary'
                  : 'text-mp-text-secondary hover:bg-mp-surface/80 hover:text-mp-text-primary'
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
