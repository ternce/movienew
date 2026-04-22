'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';

interface PlayerProgressBarProps {
  onSeek: (time: number) => void;
  className?: string;
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Video progress bar with seek functionality and buffer display
 */
export function PlayerProgressBar({ onSeek, className }: PlayerProgressBarProps) {
  const { currentTime, duration, bufferedTime, progress } = usePlayerStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = React.useState(0);
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  const bufferedPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  // Calculate time from mouse position
  const getTimeFromPosition = React.useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return 0;

      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return percent * duration;
    },
    [duration]
  );

  // Handle mouse move for hover preview
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;

      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverTime(percent * duration);
      setHoverPosition(e.clientX - rect.left);
    },
    [duration]
  );

  const handleMouseLeave = React.useCallback(() => {
    if (!isDragging) {
      setHoverTime(null);
    }
  }, [isDragging]);

  // Handle click to seek
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
    },
    [getTimeFromPosition, onSeek]
  );

  // Handle drag start
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
    },
    [getTimeFromPosition, onSeek]
  );

  // Handle touch start for mobile seek
  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      const time = getTimeFromPosition(e.touches[0].clientX);
      onSeek(time);
    },
    [getTimeFromPosition, onSeek]
  );

  // Handle drag move and end (mouse + touch)
  React.useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const time = getTimeFromPosition(e.touches[0].clientX);
      onSeek(time);
    };

    const handleGlobalEnd = () => {
      setIsDragging(false);
      setHoverTime(null);
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
  }, [isDragging, getTimeFromPosition, onSeek]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Current time */}
      <span className="text-xs text-white font-mono w-12 text-right tabular-nums">
        {formatTime(currentTime)}
      </span>

      {/* Progress bar container - min-h-[44px] provides adequate touch target */}
      <div
        ref={progressBarRef}
        className="relative flex-1 group cursor-pointer min-h-[44px] flex items-center touch-none"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
      >
        {/* Visual track — thin bar centered within the 44px touch target */}
        <div className="relative w-full h-1 group-hover:h-1.5 transition-all duration-150">
          {/* Track background */}
          <div className="absolute inset-0 bg-white/30 rounded-full">
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
              style={{ width: `${bufferedPercent}%` }}
            />

            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-mp-accent-primary to-mp-accent-secondary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Scrubber handle */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isDragging && 'opacity-100 scale-125'
            )}
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>

        {/* Hover time tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded pointer-events-none"
            style={{ left: hoverPosition }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs text-white font-mono w-12 tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  );
}

/**
 * Minimal progress bar (for overlays or mini player)
 */
export function PlayerProgressBarMini({ onSeek, className }: PlayerProgressBarProps) {
  const { progress, duration } = usePlayerStore();
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;

      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(percent * duration);
    },
    [duration, onSeek]
  );

  return (
    <div
      ref={progressBarRef}
      className={cn('relative h-1 bg-white/20 cursor-pointer', className)}
      onClick={handleClick}
    >
      <div
        className="absolute inset-y-0 left-0 bg-mp-accent-primary"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
