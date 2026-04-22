'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

/**
 * Inline SVG icons to avoid @phosphor-icons/react in prerendered not-found page
 */
function HouseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H48V120l80-80,80,80Z" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
    </svg>
  );
}

/**
 * 404 Not Found page
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-mp-bg-primary">
      <div className="text-center">
        {/* 404 graphic */}
        <div className="relative mb-8">
          <div className="text-[150px] md:text-[200px] font-bold text-mp-surface leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl md:text-8xl font-bold text-gradient">
              404
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-mp-text-primary mb-4">
          Страница не найдена
        </h1>

        <p className="text-mp-text-secondary max-w-md mx-auto mb-8">
          К сожалению, запрашиваемая страница не существует или была перемещена.
          Проверьте правильность адреса или вернитесь на главную.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="gradient" asChild>
            <Link href="/">
              <HouseIcon className="w-4 h-4" />
              На главную
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Назад
          </Button>
        </div>
      </div>
    </div>
  );
}
