'use client';

import { Star, Medal, Trophy, Crown, Diamond } from '@phosphor-icons/react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PartnerLevel } from '@/types';

interface PartnerLevelBadgeProps {
  level: PartnerLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Get level configuration
 */
function getLevelConfig(level: PartnerLevel) {
  switch (level) {
    case 'STARTER':
      return {
        label: 'Стартер',
        icon: Star,
        bgColor: 'bg-slate-800/80',
        textColor: 'text-slate-300',
        iconColor: 'text-slate-400',
        borderColor: 'border-slate-700',
      };
    case 'BRONZE':
      return {
        label: 'Бронза',
        icon: Medal,
        bgColor: 'bg-amber-900/60',
        textColor: 'text-amber-200',
        iconColor: 'text-amber-400',
        borderColor: 'border-amber-700',
      };
    case 'SILVER':
      return {
        label: 'Серебро',
        icon: Medal,
        bgColor: 'bg-gray-600/60',
        textColor: 'text-gray-200',
        iconColor: 'text-gray-300',
        borderColor: 'border-gray-500',
      };
    case 'GOLD':
      return {
        label: 'Золото',
        icon: Trophy,
        bgColor: 'bg-yellow-700/60',
        textColor: 'text-yellow-200',
        iconColor: 'text-yellow-400',
        borderColor: 'border-yellow-600',
      };
    case 'PLATINUM':
      return {
        label: 'Платина',
        icon: Crown,
        bgColor: 'bg-gradient-to-r from-cyan-800/60 to-purple-800/60',
        textColor: 'text-cyan-100',
        iconColor: 'text-cyan-300',
        borderColor: 'border-cyan-600',
      };
    default:
      return {
        label: level,
        icon: Star,
        bgColor: 'bg-slate-800',
        textColor: 'text-slate-300',
        iconColor: 'text-slate-400',
        borderColor: 'border-slate-700',
      };
  }
}

/**
 * Size configurations
 */
const sizeConfig = {
  sm: {
    badge: 'text-xs px-2 py-0.5',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  md: {
    badge: 'text-sm px-2.5 py-1',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
  lg: {
    badge: 'text-base px-3 py-1.5',
    icon: 'h-5 w-5',
    gap: 'gap-2',
  },
};

export function PartnerLevelBadge({
  level,
  size = 'md',
  showIcon = true,
  className,
}: PartnerLevelBadgeProps) {
  const config = getLevelConfig(level);
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizes.badge,
        sizes.gap,
        className
      )}
    >
      {showIcon && <Icon className={cn(sizes.icon, config.iconColor)} />}
      {config.label}
    </span>
  );
}

/**
 * Level icon only (for compact displays)
 */
interface PartnerLevelIconProps {
  level: PartnerLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PartnerLevelIcon({
  level,
  size = 'md',
  className,
}: PartnerLevelIconProps) {
  const config = getLevelConfig(level);
  const Icon = config.icon;
  const sizes = sizeConfig[size];

  return <Icon className={cn(sizes.icon, config.iconColor, className)} />;
}
