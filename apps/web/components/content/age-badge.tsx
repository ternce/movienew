import { cn } from '@/lib/utils';

export type AgeCategory = '0+' | '6+' | '12+' | '16+' | '18+';

interface AgeBadgeProps {
  age: AgeCategory;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AGE_COLORS: Record<AgeCategory, { bg: string; text: string; border: string }> = {
  '0+': {
    bg: 'bg-age-0/20',
    text: 'text-age-0',
    border: 'border-age-0/40',
  },
  '6+': {
    bg: 'bg-age-6/20',
    text: 'text-age-6',
    border: 'border-age-6/40',
  },
  '12+': {
    bg: 'bg-age-12/20',
    text: 'text-age-12',
    border: 'border-age-12/40',
  },
  '16+': {
    bg: 'bg-age-16/20',
    text: 'text-age-16',
    border: 'border-age-16/40',
  },
  '18+': {
    bg: 'bg-age-18/20',
    text: 'text-age-18',
    border: 'border-age-18/40',
  },
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 font-semibold',
  md: 'text-xs px-2 py-1 font-semibold',
  lg: 'text-sm px-2.5 py-1 font-bold',
};

/**
 * Age restriction badge with color coding
 * Colors match Russian age rating system:
 * - 0+/6+: Turquoise (#28E0C4) - Family friendly
 * - 12+: Blue (#3B82F6) - Pre-teen
 * - 16+: Orange (#F97316) - Teens
 * - 18+: Red (#EF4444) - Adults only
 */
export function AgeBadge({ age, size = 'md', className }: AgeBadgeProps) {
  const colors = AGE_COLORS[age] ?? AGE_COLORS['0+'];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border',
        colors.bg,
        colors.text,
        colors.border,
        SIZE_CLASSES[size],
        className
      )}
    >
      {age}
    </span>
  );
}

// Variant with solid background for better contrast on images
export function AgeBadgeSolid({ age, size = 'md', className }: AgeBadgeProps) {
  const solidColors: Record<AgeCategory, string> = {
    '0+': 'bg-mp-age-0 text-white',
    '6+': 'bg-mp-age-6 text-white',
    '12+': 'bg-mp-age-12 text-white',
    '16+': 'bg-mp-age-16 text-white',
    '18+': 'bg-mp-age-18 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded',
        solidColors[age],
        SIZE_CLASSES[size],
        className
      )}
    >
      {age}
    </span>
  );
}
