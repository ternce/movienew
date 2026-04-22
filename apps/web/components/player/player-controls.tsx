'use client';

import * as React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CornersOut,
  CornersIn,
  PictureInPicture,
  Subtitles,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { usePlayerStore, type VideoQuality } from '@/stores/player.store';
import { PlayerProgressBar } from './player-progress-bar';
import { PlayerVolumeControl } from './player-volume-control';
import { PlayerSettingsMenu } from './player-settings-menu';

interface PlayerControlsProps {
  title?: string;
  onSeek: (time: number) => void;
  onQualityChange: (quality: VideoQuality) => void;
  onToggleFullscreen: () => void;
  onTogglePiP?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  showPiP?: boolean;
  showSubtitles?: boolean;
  onToggleSubtitles?: () => void;
  className?: string;
}

/**
 * Bottom controls bar for video player
 */
export function PlayerControls({
  title,
  onSeek,
  onQualityChange,
  onToggleFullscreen,
  onTogglePiP,
  onSkipBack,
  onSkipForward,
  showPiP = true,
  showSubtitles = false,
  onToggleSubtitles,
  className,
}: PlayerControlsProps) {
  const {
    isPlaying,
    isFullscreen,
    isControlsVisible,
    togglePlay,
    seekRelative,
  } = usePlayerStore();

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-10);
          onSeek && onSeek(usePlayerStore.getState().currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
          onSeek && onSeek(usePlayerStore.getState().currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          usePlayerStore.getState().setVolume(
            Math.min(1, usePlayerStore.getState().volume + 0.1)
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          usePlayerStore.getState().setVolume(
            Math.max(0, usePlayerStore.getState().volume - 0.1)
          );
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          usePlayerStore.getState().toggleMute();
          break;
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          onSeek && onSeek(usePlayerStore.getState().currentTime - 10);
          break;
        case 'l':
          e.preventDefault();
          seekRelative(10);
          onSeek && onSeek(usePlayerStore.getState().currentTime + 10);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) / 10;
          const duration = usePlayerStore.getState().duration;
          onSeek(duration * percent);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, onSeek, onToggleFullscreen]);

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 px-4 pb-5 pt-8',
        'transition-opacity duration-300',
        isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      {/* Progress bar */}
      <PlayerProgressBar onSeek={onSeek} className="mb-5" />

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4">
        {/* Left controls */}
        <div className="flex items-center gap-2 md:gap-2.5">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white" weight="fill" />
            ) : (
              <Play className="w-7 h-7 text-white ml-0.5" weight="fill" />
            )}
          </button>

          {/* Skip back */}
          {onSkipBack && (
            <button
              onClick={() => {
                seekRelative(-10);
                onSeek(usePlayerStore.getState().currentTime - 10);
              }}
              className="p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
              aria-label="Назад на 10 секунд"
            >
              <SkipBack className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Skip forward */}
          {onSkipForward && (
            <button
              onClick={() => {
                seekRelative(10);
                onSeek(usePlayerStore.getState().currentTime + 10);
              }}
              className="p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
              aria-label="Вперёд на 10 секунд"
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Volume */}
          <PlayerVolumeControl />

          {/* Title */}
          {title && (
            <span className="ml-3 text-sm text-white/80 truncate max-w-[200px] hidden sm:block">
              {title}
            </span>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 md:gap-2.5">
          {/* Subtitles */}
          {showSubtitles && onToggleSubtitles && (
            <button
              onClick={onToggleSubtitles}
              className="p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
              aria-label="Субтитры"
            >
              <Subtitles className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Settings */}
          <PlayerSettingsMenu onQualityChange={onQualityChange} />

          {/* Picture in Picture — hidden on mobile to save space */}
          {showPiP && onTogglePiP && document.pictureInPictureEnabled && (
            <button
              onClick={onTogglePiP}
              className="hidden sm:block p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
              aria-label="Картинка в картинке"
            >
              <PictureInPicture className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary"
            aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          >
            {isFullscreen ? (
              <CornersIn className="w-5 h-5 text-white" />
            ) : (
              <CornersOut className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Top bar with title and close button (for fullscreen/modal)
 */
export function PlayerTopBar({
  title,
  subtitle,
  onClose,
  visible,
  className,
}: {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  visible: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute top-0 left-0 right-0 px-4 pt-4 pb-8',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {title && (
            <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-white/70 truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
