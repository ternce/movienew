'use client';

/**
 * Global loading component
 * Uses CSS spinner to avoid @phosphor-icons/react in prerendered contexts
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="w-10 h-10 text-mp-accent-primary animate-spin"
          viewBox="0 0 256 256"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" opacity="0.2" />
          <path d="M128,24a8,8,0,0,1,8,8V64a8,8,0,0,1-16,0V32A8,8,0,0,1,128,24Z" />
        </svg>
        <p className="text-sm text-mp-text-secondary">Загрузка...</p>
      </div>
    </div>
  );
}
