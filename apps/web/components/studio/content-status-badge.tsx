import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Черновик',
    className: 'bg-mp-text-secondary/10 text-mp-text-secondary',
  },
  PENDING: {
    label: 'На модерации',
    className: 'bg-yellow-500/10 text-yellow-400',
  },
  PUBLISHED: {
    label: 'Опубликован',
    className: 'bg-mp-success-bg text-mp-success-text',
  },
  REJECTED: {
    label: 'Отклонён',
    className: 'bg-mp-error-bg text-mp-error-text',
  },
  ARCHIVED: {
    label: 'Архив',
    className: 'bg-slate-500/10 text-slate-400',
  },
};

interface ContentStatusBadgeProps {
  status: string;
  className?: string;
}

export function ContentStatusBadge({ status, className }: ContentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

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
