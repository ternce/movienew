'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toast notification provider using Sonner
 * Styled to match MoviePlatform design system
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        },
        classNames: {
          toast: 'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:bg-mp-success-bg group-[.toaster]:text-mp-success-text group-[.toaster]:border-mp-success-text/20',
          error: 'group-[.toaster]:bg-mp-error-bg group-[.toaster]:text-mp-error-text group-[.toaster]:border-mp-error-text/20',
          warning: 'group-[.toaster]:bg-mp-warning-bg group-[.toaster]:text-mp-warning-text group-[.toaster]:border-mp-warning-text/20',
          info: 'group-[.toaster]:bg-card group-[.toaster]:text-foreground',
        },
      }}
    />
  );
}

/**
 * Re-export toast function for convenience
 */
export { toast } from 'sonner';
