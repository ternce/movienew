'use client';

import type { Icon } from '@phosphor-icons/react';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Info,
  Sparkle,
  WarningCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import type * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FinancialInfoPageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FinancialInfoPageShell({
  children,
  className,
  contentClassName,
}: FinancialInfoPageShellProps) {
  return (
    <main
      className={cn(
        'relative isolate min-h-screen pb-[calc(112px+env(safe-area-inset-bottom,0px))] pt-4 md:pb-14 md:pt-6',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[#ff2d6f]/35 to-transparent" />
      <div
        className={cn(
          'mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 sm:px-6 md:gap-5 lg:px-8',
          contentClassName
        )}
      >
        {children}
      </div>
    </main>
  );
}

interface FutureFeatureBadgeProps {
  children?: React.ReactNode;
  className?: string;
}

export function FutureFeatureBadge({
  children = 'Готово к будущему модулю',
  className,
}: FutureFeatureBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'w-fit rounded-full border-[#ff2d6f]/25 bg-[#ff2d6f]/[0.08] px-2.5 py-0.5 text-[10px] font-semibold text-[#ffd4df] shadow-none',
        className
      )}
    >
      <Sparkle className="mr-1 h-3 w-3" />
      {children}
    </Badge>
  );
}

interface FinancialInfoHeroProps {
  icon: Icon;
  eyebrow?: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

export function FinancialInfoHero({
  icon: IconComponent,
  eyebrow,
  title,
  description,
  children,
  className,
}: FinancialInfoHeroProps) {
  return (
    <section
      className={cn(
        'relative rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6 md:p-5',
        className
      )}
    >
      <div className="min-w-0">
        <div className="relative mb-3 flex flex-wrap items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ff2d6f]/[0.22] bg-[#ff2d6f]/[0.1] text-[#ff7b9d] shadow-none">
            <IconComponent className="h-5 w-5" />
          </div>
          {eyebrow}
        </div>
        <h1 className="relative max-w-3xl text-[clamp(1.45rem,2.2vw,2.1rem)] font-bold leading-tight text-white">
          {title}
        </h1>
        <p className="relative mt-2 max-w-2xl text-sm leading-6 text-mp-text-secondary">
          {description}
        </p>
      </div>
      {children && <div className="relative mt-4 flex flex-col gap-2 md:mt-0 md:min-w-52">{children}</div>}
    </section>
  );
}

export interface FinancialStep {
  title: string;
  description: string;
  icon: Icon;
}

interface FinancialStepCardProps extends FinancialStep {
  index: number;
  className?: string;
}

export function FinancialStepCard({
  index,
  title,
  description,
  icon: IconComponent,
  className,
}: FinancialStepCardProps) {
  return (
    <Card
      className={cn(
        'group h-full overflow-hidden rounded-xl border-white/[0.08] bg-white/[0.035] shadow-none backdrop-blur-xl transition-colors hover:border-[#ff2d6f]/[0.2]',
        className
      )}
    >
      <CardContent className="flex h-full gap-3 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ff2d6f]/[0.28] bg-[#ff2d6f]/[0.1] text-sm font-bold text-white shadow-none">
            {index}
          </div>
          <div className="h-full min-h-8 w-px bg-gradient-to-b from-[#ff2d6f]/[0.28] to-transparent md:hidden" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[#b94bff]/[0.16] bg-[#b94bff]/[0.08] text-[#e5b7ff] transition-colors group-hover:bg-[#ff2d6f]/[0.1] group-hover:text-[#ff8aad]">
            <IconComponent className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-mp-text-secondary">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface FinancialStepsTimelineProps {
  steps: FinancialStep[];
  className?: string;
}

export function FinancialStepsTimeline({
  steps,
  className,
}: FinancialStepsTimelineProps) {
  return (
    <section className={cn('grid gap-3 md:grid-cols-2', className)}>
      {steps.map((step, index) => (
        <FinancialStepCard key={step.title} {...step} index={index + 1} />
      ))}
    </section>
  );
}

type NoticeTone = 'info' | 'success' | 'warning';

const noticeToneConfig: Record<NoticeTone, { icon: Icon; className: string; iconClassName: string }> = {
  info: {
    icon: Info,
    className: 'border-[#b94bff]/[0.22] bg-[#b94bff]/[0.07]',
    iconClassName: 'border-[#b94bff]/20 bg-[#b94bff]/[0.12] text-[#e5b7ff]',
  },
  success: {
    icon: CheckCircle,
    className: 'border-emerald-300/[0.18] bg-emerald-300/[0.06]',
    iconClassName: 'border-emerald-300/[0.18] bg-emerald-300/10 text-emerald-300',
  },
  warning: {
    icon: WarningCircle,
    className: 'border-[#ffb86b]/[0.22] bg-[#ffb86b]/[0.07]',
    iconClassName: 'border-[#ffb86b]/20 bg-[#ffb86b]/[0.12] text-[#ffcf8a]',
  },
};

interface FinancialNoticeCardProps {
  title: string;
  description: string;
  tone?: NoticeTone;
  icon?: Icon;
  children?: React.ReactNode;
  className?: string;
}

export function FinancialNoticeCard({
  title,
  description,
  tone = 'info',
  icon,
  children,
  className,
}: FinancialNoticeCardProps) {
  const config = noticeToneConfig[tone];
  const IconComponent = icon ?? config.icon;

  return (
    <Card
      className={cn(
        'rounded-xl border bg-white/[0.035] shadow-none backdrop-blur-xl',
        config.className,
        className
      )}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', config.iconClassName)}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-mp-text-secondary">{description}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

interface FinancialCTA {
  href: string;
  label: string;
  variant?: 'default' | 'outline' | 'ghost';
}

interface FinancialCTAGroupProps {
  actions: FinancialCTA[];
  className?: string;
}

export function FinancialCTAGroup({ actions, className }: FinancialCTAGroupProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap', className)}>
      {actions.map((action) => (
        <Button
          key={action.href}
          variant={action.variant ?? 'gradient'}
          asChild
          className="min-h-10 justify-center rounded-lg px-4 text-sm"
        >
          <Link href={action.href}>
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ))}
    </div>
  );
}

interface FinancialFAQItem {
  question: string;
  answer: string;
}

interface FinancialFAQProps {
  items: FinancialFAQItem[];
  className?: string;
}

export function FinancialFAQ({ items, className }: FinancialFAQProps) {
  return (
    <section className={cn('grid gap-2', className)}>
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 backdrop-blur-xl"
        >
          <summary className="cursor-pointer list-none font-semibold text-white marker:hidden">
            {item.question}
          </summary>
          <p className="mt-2 text-sm leading-6 text-mp-text-secondary">{item.answer}</p>
        </details>
      ))}
    </section>
  );
}

interface FinancialProcessPreviewItem {
  label: string;
  value: string;
}

interface FinancialProcessPreviewProps {
  title: string;
  description: string;
  items: FinancialProcessPreviewItem[];
  className?: string;
}

export function FinancialProcessPreview({
  title,
  description,
  items,
  className,
}: FinancialProcessPreviewProps) {
  return (
    <Card className={cn('overflow-hidden rounded-xl border-white/[0.08] bg-white/[0.035] shadow-none backdrop-blur-xl', className)}>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ff2d6f]/20 bg-[#ff2d6f]/[0.1] text-[#ff8aad]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-mp-text-secondary">{description}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
            >
              <p className="text-xs uppercase tracking-[0.08em] text-mp-text-disabled">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
