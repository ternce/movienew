'use client';

import { Play, PaperPlaneTilt, InstagramLogo, YoutubeLogo } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

const footerLinks = {
  content: [
    { label: 'Сериалы', href: '/series' },
    { label: 'Обучение', href: '/tutorials' },
    { label: 'Клипы', href: '/clips' },
    { label: 'Шортс', href: '/shorts' },
  ],
  company: [
    { label: 'О нас', href: '/about' },
    { label: 'Партнерам', href: '/partner' },
    { label: 'Тарифы', href: '/pricing' },
    { label: 'Поддержка', href: '/support' },
  ],
  legal: [
    { label: 'Условия использования', href: '/documents/terms' },
    { label: 'Конфиденциальность', href: '/documents/privacy' },
    { label: 'Правила платформы', href: '/documents/rules' },
  ],
};

const socialLinks = [
  { icon: YoutubeLogo, href: '#', label: 'YouTube' },
  { icon: InstagramLogo, href: '#', label: 'Instagram' },
  { icon: PaperPlaneTilt, href: '#', label: 'Telegram' },
];

export function LandingFooter() {
  const [email, setEmail] = useState('');

  return (
    <footer className="relative bg-[#080B12] pt-12 md:pt-16 pb-8">
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201,75,255,0.3) 50%, transparent 100%)',
        }}
      />

      <div className="container mx-auto px-4 sm:px-6">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 mb-10 md:mb-12">
          {/* Brand + Social */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mp-accent-primary to-mp-accent-secondary flex items-center justify-center">
                <Play className="w-4 h-4 text-white" weight="fill" />
              </div>
              <span className="text-lg font-bold text-mp-text-primary tracking-tight">
                MoviePlatform
              </span>
            </div>
            <p className="text-sm text-mp-text-secondary leading-relaxed mb-6 max-w-xs">
              Платформа для качественного видеоконтента и обучающих материалов
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-mp-text-secondary hover:text-mp-text-primary hover:bg-white/[0.08] transition-all duration-200"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Content links */}
          <div>
            <h4 className="font-semibold text-mp-text-primary mb-4 text-sm">
              Контент
            </h4>
            <ul className="space-y-3">
              {footerLinks.content.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-mp-accent-primary group-hover:w-full transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-semibold text-mp-text-primary mb-4 text-sm">
              Компания
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-mp-accent-primary group-hover:w-full transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Newsletter */}
          <div>
            <h4 className="font-semibold text-mp-text-primary mb-4 text-sm">
              Документы
            </h4>
            <ul className="space-y-3 mb-6">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-mp-accent-primary group-hover:w-full transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Newsletter */}
            <div className="hidden md:block">
              <p className="text-xs text-mp-text-disabled mb-2">Рассылка</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="flex-1 min-w-0 h-9 px-3 text-sm rounded-lg bg-white/[0.04] border border-white/[0.06] text-mp-text-primary placeholder:text-mp-text-disabled focus:outline-none focus:border-mp-accent-primary/40 transition-colors"
                />
                <Button variant="glass" size="sm">
                  Подписаться
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-mp-text-disabled" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} MoviePlatform. Все права защищены.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/documents/terms"
              className="text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors"
            >
              Условия
            </Link>
            <Link
              href="/documents/privacy"
              className="text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors"
            >
              Конфиденциальность
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
