'use client';

import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

type TransitionVariant = 'fade' | 'slideUp' | 'slideLeft' | 'scale';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  variant?: TransitionVariant;
}

const expoOut = [0.16, 1, 0.3, 1] as const;

const variants: Record<TransitionVariant, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
};

/**
 * Page transition wrapper using framer-motion.
 * Supports multiple animation variants and respects prefers-reduced-motion.
 */
export function PageTransition({
  children,
  className,
  variant = 'slideUp',
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const selectedVariant = variants[variant];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariant}
      transition={{ duration: 0.3, ease: expoOut as unknown as number[] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
