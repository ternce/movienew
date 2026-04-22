'use client';

import { CaretRight, CaretDown, User, Users } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReferralNode as ReferralNodeType } from '@/types';

interface ReferralNodeProps {
  node: ReferralNodeType;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
  level?: number;
  className?: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Level colors for visual hierarchy
 */
const levelColors = [
  'border-mp-accent-primary',
  'border-mp-accent-secondary',
  'border-yellow-500',
  'border-orange-500',
  'border-red-500',
];

export function ReferralNodeComponent({
  node,
  isExpanded,
  onToggle,
  level = 0,
  className,
}: ReferralNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const borderColor = levelColors[Math.min(level, levelColors.length - 1)];

  return (
    <div className={cn('relative', className)}>
      {/* Node content */}
      <div
        className={cn(
          'flex items-center gap-2 sm:gap-3 p-3 rounded-lg bg-mp-surface border-l-4 hover:bg-mp-surface-elevated transition-colors overflow-hidden',
          borderColor
        )}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? (
              <CaretDown className="h-4 w-4" />
            ) : (
              <CaretRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6 h-6 shrink-0" />
        )}

        {/* Avatar */}
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            node.isActive ? 'bg-emerald-500/20' : 'bg-mp-surface-elevated'
          )}
        >
          <User
            className={cn(
              'h-4 w-4',
              node.isActive ? 'text-emerald-400' : 'text-mp-text-disabled'
            )}
          />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {node.firstName} {node.lastName}
            </span>
            {node.isActive ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Активен
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-mp-surface-elevated text-mp-text-disabled">
                Неактивен
              </span>
            )}
          </div>
          <div className="text-xs text-mp-text-secondary truncate">
            {node.email}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:block text-right shrink-0">
          <div className="text-sm font-medium">
            {formatCurrency(node.commissionsGenerated)}
          </div>
          <div className="text-xs text-mp-text-secondary">
            {formatDate(node.registeredAt)}
          </div>
        </div>

        {/* Level badge */}
        <div
          className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
            'bg-mp-surface-elevated'
          )}
        >
          {node.level}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-6 mt-2 space-y-2 relative">
          {/* Connecting line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-mp-border" />

          {node.children?.map((child) => (
            <ReferralNodeComponent
              key={child.id}
              node={child}
              isExpanded={isExpanded} // Pass parent's expansion state for now
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
