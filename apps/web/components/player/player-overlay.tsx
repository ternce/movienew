'use client';

import { Play, Pause, ArrowCounterClockwise, WarningCircle } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';

import { normalizeMediaUrl } from '@/lib/media-url';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';

interface PlayerOverlayProps {
  onPlayPause: () => void;
  onReplay?: () => void;
  className?: string;
}

/**
 * Large overlay button for play/pause/replay
 * Shows based on player state (paused, ended, buffering, error)
 */
export function PlayerOverlay({ onPlayPause, onReplay, className }: PlayerOverlayProps) {
  const { isPlaying, isPaused, isBuffering, isEnded, error, isControlsVisible } = usePlayerStore();

  // Determine what to show
  const showPlayButton = isPaused && !isBuffering && !isEnded && !error;
  const showPauseIndicator = isPlaying && isControlsVisible;
  const showBuffering = isBuffering;
  const showEnded = isEnded && !error;
  const showError = !!error;

  // Don't show anything when playing and controls hidden
  if (isPlaying && !isControlsVisible && !isBuffering) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center pointer-events-none',
        'transition-opacity duration-200',
        className
      )}
    >
      {/* Buffering spinner */}
      {showBuffering && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <span className="text-sm text-white/80">Загрузка...</span>
        </div>
      )}

      {/* Play button */}
      {showPlayButton && !showBuffering && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause();
          }}
          className="pointer-events-auto group w-20 h-20 rounded-full bg-mp-accent-primary/90 backdrop-blur-sm flex items-center justify-center shadow-glow-primary hover:scale-110 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-mp-accent-primary/50"
          aria-label="Воспроизвести"
        >
          <Play className="w-10 h-10 text-white ml-1" weight="fill" />
        </button>
      )}

      {/* Pause indicator (brief flash on click) */}
      {showPauseIndicator && !showBuffering && (
        <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Pause className="w-10 h-10 text-white" weight="fill" />
        </div>
      )}

      {/* Ended state - replay button */}
      {showEnded && !showBuffering && (
        <div className="pointer-events-auto flex flex-col items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReplay?.();
            }}
            className="group w-20 h-20 rounded-full bg-mp-accent-primary/90 backdrop-blur-sm flex items-center justify-center shadow-glow-primary hover:scale-110 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-mp-accent-primary/50"
            aria-label="Воспроизвести заново"
          >
            <ArrowCounterClockwise className="w-10 h-10 text-white" />
          </button>
          <span className="text-white font-medium">Смотреть снова</span>
        </div>
      )}

      {/* Error state */}
      {showError && (
        <div className="pointer-events-auto flex flex-col items-center gap-4 max-w-sm text-center px-4">
          <div className="w-16 h-16 rounded-full bg-mp-error-bg flex items-center justify-center">
            <WarningCircle className="w-8 h-8 text-mp-error-text" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Ошибка воспроизведения</p>
            <p className="text-sm text-mp-text-secondary">{error}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.reload();
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Gradient overlay at top and bottom for controls visibility
 */
export function PlayerGradientOverlay({ visible }: { visible: boolean }) {
  return (
    <>
      {/* Top gradient */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none',
          'transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* Bottom gradient */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none',
          'transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
      />
    </>
  );
}

/**
 * Skip intro/outro button
 */
export function PlayerSkipButton({
  label,
  onClick,
  visible,
}: {
  label: string;
  onClick: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-24 right-6 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
    >
      {label}
    </button>
  );
}

/**
 * Next episode button overlay
 */
export function PlayerNextEpisode({
  title,
  thumbnailUrl,
  countdown,
  onPlay,
  onCancel,
  visible,
}: {
  title: string;
  thumbnailUrl?: string;
  countdown: number;
  onPlay: () => void;
  onCancel: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="absolute bottom-24 right-6 max-w-xs bg-mp-surface/95 backdrop-blur-sm border border-mp-border rounded-xl overflow-hidden shadow-xl">
      {thumbnailUrl && (
        <div className="relative aspect-video bg-mp-surface-2">
        <img
          src={thumbnailUrl ? normalizeMediaUrl(thumbnailUrl) : thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs text-mp-text-secondary mb-1">Следующая серия через {countdown}...</p>
        <p className="text-sm font-medium text-white truncate mb-3">{title}</p>
        <div className="flex gap-2">
          <button
            onClick={onPlay}
            className="flex-1 px-3 py-2 bg-mp-accent-primary hover:bg-mp-accent-primary/90 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Смотреть
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
