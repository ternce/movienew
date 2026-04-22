'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface SortableWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableWrapper({ id, children, className }: SortableWrapperProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow duration-200',
        isDragging && 'ring-2 ring-[#c94bff]/50 shadow-lg opacity-90',
        className
      )}
    >
      {children}
    </div>
  );
}
