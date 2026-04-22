import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  SERIES: {
    label: 'Сериал',
    className: 'bg-mp-accent-primary/10 text-mp-accent-primary',
  },
  CLIP: {
    label: 'Клип',
    className: 'bg-mp-accent-secondary/10 text-mp-accent-secondary',
  },
  SHORT: {
    label: 'Шорт',
    className: 'bg-orange-500/10 text-orange-400',
  },
  TUTORIAL: {
    label: 'Туториал',
    className: 'bg-blue-500/10 text-blue-400',
  },
};

interface ContentTypeBadgeProps {
  type: string;
  className?: string;
}

export function ContentTypeBadge({ type, className }: ContentTypeBadgeProps) {
  const config = TYPE_CONFIG[type] || { label: type, className: 'bg-mp-surface text-mp-text-secondary' };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
