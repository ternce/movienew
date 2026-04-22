'use client';

import { Play } from '@phosphor-icons/react';
import Link from 'next/link';

/**
 * Auth layout - centered layout for login/register pages
 */
export default function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-mp-bg-primary">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-mp-accent-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-mp-accent-secondary/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-mp-accent-primary flex items-center justify-center">
            <Play className="w-4 h-4 text-white" weight="fill" />
          </div>
          <span className="text-xl font-bold text-mp-text-primary">
            Movie<span className="text-gradient">Platform</span>
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <p className="text-sm text-mp-text-disabled" suppressHydrationWarning>
          &copy; {new Date().getFullYear()} MoviePlatform. Все права защищены.
        </p>
      </footer>
    </div>
  );
}
