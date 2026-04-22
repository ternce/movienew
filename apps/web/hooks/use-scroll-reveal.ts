'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollRevealOptions {
  /** Threshold for triggering reveal (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Only trigger once */
  triggerOnce?: boolean;
  /** Delay before reveal animation (ms) */
  delay?: number;
}

/**
 * Hook for scroll-triggered reveal animations
 * Returns a ref to attach to the element and visibility state
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  delay = 0,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasTriggered(true);
            }, delay);
          } else {
            setIsVisible(true);
            setHasTriggered(true);
          }
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, delay, hasTriggered]);

  return { ref, isVisible };
}

/**
 * Hook for staggered reveal animations on multiple children
 */
export function useStaggeredReveal<T extends HTMLElement = HTMLDivElement>({
  itemCount,
  staggerDelay = 100,
  ...options
}: UseScrollRevealOptions & {
  itemCount: number;
  staggerDelay?: number;
}) {
  const { ref, isVisible } = useScrollReveal<T>(options);
  const [visibleItems, setVisibleItems] = useState<boolean[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Stagger the reveal of each item
      const timers: ReturnType<typeof setTimeout>[] = [];

      for (let i = 0; i < itemCount; i++) {
        const timer = setTimeout(() => {
          setVisibleItems((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * staggerDelay);
        timers.push(timer);
      }

      return () => {
        timers.forEach(clearTimeout);
      };
    }
    setVisibleItems([]);
    return undefined;
  }, [isVisible, itemCount, staggerDelay]);

  const getItemProps = useCallback(
    (index: number) => ({
      style: {
        opacity: visibleItems[index] ? 1 : 0,
        transform: visibleItems[index] ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      },
    }),
    [visibleItems]
  );

  return { ref, isVisible, visibleItems, getItemProps };
}

/**
 * Hook for parallax scrolling effect
 */
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const relativeScroll = scrolled - elementTop;
      setOffset(relativeScroll * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed]);

  return { ref, offset };
}

/**
 * Hook for detecting scroll direction
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [prevScrollY, setPrevScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > prevScrollY) {
        setScrollDirection('down');
      } else if (currentScrollY < prevScrollY) {
        setScrollDirection('up');
      }

      setPrevScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prevScrollY]);

  return scrollDirection;
}
