'use client';

import { Play, List, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const navLinks = [
  { label: 'Сериалы', href: '/series' },
  { label: 'Обучение', href: '/tutorials' },
  { label: 'Тарифы', href: '/pricing' },
  { label: 'Партнерам', href: '/partner' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-white/[0.03] backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent'
        )}
      >
        {/* Gradient accent line at bottom */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500',
            scrolled ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(201,75,255,0.4) 50%, transparent 100%)',
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mp-accent-primary to-mp-accent-secondary flex items-center justify-center shadow-lg shadow-mp-accent-primary/20">
              <Play className="w-4 h-4 text-white" weight="fill" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-mp-text-primary tracking-tight">
              MoviePlatform
            </span>
          </Link>

          {/* Center nav links - desktop only */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-mp-text-secondary hover:text-mp-text-primary transition-colors duration-200 py-1 group"
              >
                {link.label}
                {/* Active dot indicator on hover */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-mp-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>
            ))}
          </nav>

          {/* Auth buttons + Mobile hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isHydrated && isAuthenticated ? (
              <Button variant="gradient" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/dashboard">Личный кабинет</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href="/login">Войти</Link>
                </Button>
                <Button variant="gradient" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href="/register">Начать</Link>
                </Button>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-mp-text-secondary hover:text-mp-text-primary transition-colors"
              aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              {mobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <List className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#080B12]/95 backdrop-blur-xl border-l border-white/[0.06] pt-20 px-6">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium text-mp-text-secondary hover:text-mp-text-primary transition-colors py-3 px-3 rounded-lg hover:bg-white/[0.04]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-8 flex flex-col gap-3">
              {isHydrated && isAuthenticated ? (
                <Button variant="gradient" size="default" className="w-full justify-center" asChild>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    Личный кабинет
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="default" className="w-full justify-center" asChild>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      Войти
                    </Link>
                  </Button>
                  <Button variant="gradient" size="default" className="w-full justify-center" asChild>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      Начать бесплатно
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
