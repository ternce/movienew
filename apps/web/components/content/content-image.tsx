'use client';

import { FilmStrip } from '@phosphor-icons/react';
import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

import { normalizeMediaUrl } from '@/lib/media-url';
import { cn } from '@/lib/utils';

interface ContentImageProps extends Omit<ImageProps, 'onError'> {
  fallbackIcon?: React.ReactNode;
  fallbackClassName?: string;
}

/**
 * Image wrapper with graceful error fallback.
 * When src is falsy or the image fails to load, renders
 * a placeholder icon instead of a broken-image icon.
 */
export function ContentImage({
  src,
  fallbackIcon,
  fallbackClassName,
  className,
  alt,
  unoptimized,
  ...props
}: ContentImageProps) {
  const [hasError, setHasError] = useState(false);

  const normalizedSrc =
    typeof src === 'string' ? normalizeMediaUrl(src) : src;

  // Next.js Image optimizer is strict about upstream response headers.
  // Our MinIO proxy (/minio/*) can return objects without ideal metadata in dev,
  // so we bypass optimization for these URLs to avoid 400 from /_next/image.
  const isMinioProxyPath =
    typeof normalizedSrc === 'string' && normalizedSrc.startsWith('/minio/');

  // In Docker dev, the Next.js server runs in a container where `localhost` points to itself.
  // If we try to optimize `http://localhost:4000/...` (API) or `http://localhost:9000/...` (MinIO),
  // the optimizer fetch will fail and return 500. For these URLs, bypass optimization so the
  // browser fetches them directly.
  const isLocalhostAbsoluteUrl = (() => {
    if (typeof normalizedSrc !== 'string') return false;
    if (!normalizedSrc.startsWith('http://') && !normalizedSrc.startsWith('https://')) return false;
    try {
      const u = new URL(normalizedSrc);
      return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  })();

  const finalUnoptimized =
    unoptimized ?? (isMinioProxyPath || isLocalhostAbsoluteUrl);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={cn(
          'w-full h-full bg-mp-surface-elevated flex items-center justify-center',
          fallbackClassName,
        )}
      >
        {fallbackIcon ?? (
          <FilmStrip className="w-12 h-12 text-mp-text-disabled" />
        )}
      </div>
    );
  }

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      unoptimized={finalUnoptimized}
      {...props}
    />
  );
}
