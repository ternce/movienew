'use client';

import { Package } from '@phosphor-icons/react';
import Image from 'next/image';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ProductImageGallery({ images, productName, className }: ProductImageGalleryProps) {
  const safeImages = Array.isArray(images) ? images : [];
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const hasImages = safeImages.length > 0;
  const currentImage = hasImages ? safeImages[selectedIndex] : null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-mp-surface-elevated">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={productName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-mp-text-disabled" />
          </div>
        )}
      </div>

      {/* Thumbnail row */}
      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors',
                index === selectedIndex
                  ? 'border-mp-accent-primary'
                  : 'border-transparent hover:border-mp-border',
              )}
            >
              <Image
                src={image}
                alt={`${productName} - ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
