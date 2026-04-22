'use client';

import * as React from 'react';
import { SpeakerNone, SpeakerLow, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';

interface PlayerVolumeControlProps {
  className?: string;
}

/**
 * Volume control with mute toggle and slider
 */
export function PlayerVolumeControl({ className }: PlayerVolumeControlProps) {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const displayVolume = isMuted ? 0 : volume;

  // Get volume icon based on level
  const VolumeIcon = React.useMemo(() => {
    if (isMuted || volume === 0) return SpeakerSlash;
    if (volume < 0.33) return SpeakerNone;
    if (volume < 0.67) return SpeakerLow;
    return SpeakerHigh;
  }, [volume, isMuted]);

  // Calculate volume from mouse position
  const getVolumeFromPosition = React.useCallback((clientX: number) => {
    const slider = sliderRef.current;
    if (!slider) return 0;

    const rect = slider.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  // Handle slider click
  const handleSliderClick = React.useCallback(
    (e: React.MouseEvent) => {
      const newVolume = getVolumeFromPosition(e.clientX);
      setVolume(newVolume);
    },
    [getVolumeFromPosition, setVolume]
  );

  // Handle drag start
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      const newVolume = getVolumeFromPosition(e.clientX);
      setVolume(newVolume);
    },
    [getVolumeFromPosition, setVolume]
  );

  // Handle touch start on slider
  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      const newVolume = getVolumeFromPosition(e.touches[0].clientX);
      setVolume(newVolume);
    },
    [getVolumeFromPosition, setVolume]
  );

  // Handle drag move and end (mouse + touch)
  React.useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newVolume = getVolumeFromPosition(e.clientX);
      setVolume(newVolume);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const newVolume = getVolumeFromPosition(e.touches[0].clientX);
      setVolume(newVolume);
    };

    const handleGlobalEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [isDragging, getVolumeFromPosition, setVolume]);

  // Handle keyboard volume control
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    },
    [volume, setVolume, toggleMute]
  );

  return (
    <>
      {/* Mobile: mute-only toggle (phones have hardware volume) */}
      <div className={cn('flex items-center md:hidden', className)}>
        <button
          onClick={toggleMute}
          className="p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          <VolumeIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Desktop: mute button + expandable slider */}
      <div
        className={cn('hidden md:flex items-center gap-2', className)}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => !isDragging && setIsExpanded(false)}
      >
        {/* Mute button */}
        <button
          onClick={toggleMute}
          onKeyDown={handleKeyDown}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          <VolumeIcon className="w-5 h-5 text-white" />
        </button>

        {/* Volume slider */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isExpanded || isDragging ? 'w-20 opacity-100' : 'w-0 opacity-0'
          )}
        >
          <div
            ref={sliderRef}
            className="relative h-1 bg-white/20 rounded-full cursor-pointer"
            onClick={handleSliderClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Volume level */}
            <div
              className="absolute inset-y-0 left-0 bg-white rounded-full"
              style={{ width: `${displayVolume * 100}%` }}
            />

            {/* Handle */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg',
                'transition-transform',
                isDragging && 'scale-125'
              )}
              style={{ left: `calc(${displayVolume * 100}% - 6px)` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Vertical volume control (for mobile or overlay)
 */
export function PlayerVolumeControlVertical({ className }: PlayerVolumeControlProps) {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const displayVolume = isMuted ? 0 : volume;

  const VolumeIcon = React.useMemo(() => {
    if (isMuted || volume === 0) return SpeakerSlash;
    if (volume < 0.33) return SpeakerNone;
    if (volume < 0.67) return SpeakerLow;
    return SpeakerHigh;
  }, [volume, isMuted]);

  const getVolumeFromPosition = React.useCallback((clientY: number) => {
    const slider = sliderRef.current;
    if (!slider) return 0;

    const rect = slider.getBoundingClientRect();
    // Invert because we want bottom to be 0 and top to be 1
    return Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
  }, []);

  const handleSliderClick = React.useCallback(
    (e: React.MouseEvent) => {
      const newVolume = getVolumeFromPosition(e.clientY);
      setVolume(newVolume);
    },
    [getVolumeFromPosition, setVolume]
  );

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      const newVolume = getVolumeFromPosition(e.clientY);
      setVolume(newVolume);
    },
    [getVolumeFromPosition, setVolume]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newVolume = getVolumeFromPosition(e.clientY);
      setVolume(newVolume);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, getVolumeFromPosition, setVolume]);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Volume slider (vertical) */}
      <div
        ref={sliderRef}
        className="relative w-1 h-20 bg-white/20 rounded-full cursor-pointer"
        onClick={handleSliderClick}
        onMouseDown={handleMouseDown}
      >
        {/* Volume level */}
        <div
          className="absolute inset-x-0 bottom-0 bg-white rounded-full"
          style={{ height: `${displayVolume * 100}%` }}
        />

        {/* Handle */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg',
            isDragging && 'scale-125'
          )}
          style={{ bottom: `calc(${displayVolume * 100}% - 6px)` }}
        />
      </div>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
      >
        <VolumeIcon className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
