'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface AgeRatingSelectorProps {
  value: string;
  onChange: (age: string) => void;
  disabled?: boolean;
}

const AGE_CATEGORIES = [
  { label: '0+', color: '#28E0C4' },
  { label: '6+', color: '#28E0C4' },
  { label: '12+', color: '#3B82F6' },
  { label: '16+', color: '#F97316' },
  { label: '18+', color: '#EF4444' },
] as const;

function AgeButton({
  label,
  color,
  isSelected,
  disabled,
  onClick,
}: {
  label: string;
  color: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  const style = React.useMemo(() => {
    if (isSelected) {
      return {
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
      };
    }
    if (isHovered && !disabled) {
      return {
        borderColor: color,
      };
    }
    return {};
  }, [isSelected, isHovered, color, disabled]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]',
        !isSelected && 'bg-mp-surface border-mp-border text-mp-text-secondary',
        disabled && 'pointer-events-none opacity-50'
      )}
      style={style}
    >
      {label}
    </button>
  );
}

export function AgeRatingSelector({
  value,
  onChange,
  disabled = false,
}: AgeRatingSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {AGE_CATEGORIES.map(({ label, color }) => (
        <AgeButton
          key={label}
          label={label}
          color={color}
          isSelected={value === label}
          disabled={disabled}
          onClick={() => onChange(label)}
        />
      ))}
    </div>
  );
}
