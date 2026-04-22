'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'left';
  className?: string;
}

const directionOffsets = {
  up: { y: 40, x: 0 },
  left: { y: 0, x: 40 },
};

export function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  className,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const offset = directionOffsets[direction];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before client mount or with reduced motion, render visible immediately
  if (!mounted || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
