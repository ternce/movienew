'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { usePlayerStore, type VideoQuality } from '@/stores/player.store';
import { usePlayer } from './use-player';
import { PlayerControls, PlayerTopBar } from './player-controls';
import { PlayerOverlay, PlayerGradientOverlay } from './player-overlay';

export interface VideoPlayerProps {
  /** HLS manifest URL */
  src: string;
  /** Poster image URL */
  poster?: string;
  /** Video title */
  title?: string;
  /** Episode/series subtitle */
  subtitle?: string;
  /** Auto-play on load */
  autoPlay?: boolean;
  /** Resume from position (seconds) */
  initialTime?: number;
  /** Progress callback (debounced, every 10s) */
  onProgress?: (time: number) => void;
  /** Video ended callback */
  onEnded?: () => void;
  /** Error callback */
  onError?: (error: string) => void;
  /** Called when stream URL expires (403 from CDN) */
  onUrlExpired?: () => void;
  /** Close button handler (for modal/fullscreen) */
  onClose?: () => void;
  /** Show skip buttons */
  showSkipButtons?: boolean;
  /** Show PiP button */
  showPiP?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Full-featured HLS video player with custom dark-themed controls
 *
 * Features:
 * - HLS.js adaptive streaming
 * - Quality selection
 * - Playback speed control
 * - Volume control with keyboard shortcuts
 * - Progress bar with seek preview
 * - Fullscreen and Picture-in-Picture
 * - Auto-hide controls
 * - Keyboard shortcuts (space, arrows, f, m, j, l, 0-9)
 * - Progress tracking for API
 * - Error handling and recovery
 */
export function VideoPlayer({
  src,
  poster,
  title,
  subtitle,
  autoPlay = false,
  initialTime = 0,
  onProgress,
  onEnded,
  onError,
  onUrlExpired,
  onClose,
  showSkipButtons = true,
  showPiP = true,
  className,
}: VideoPlayerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastTapRef = React.useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const [seekFeedback, setSeekFeedback] = React.useState<{ side: 'left' | 'right'; visible: boolean }>({
    side: 'left',
    visible: false,
  });

  const {
    isControlsVisible,
    setSettingsOpen,
    updateActivity,
    reset,
  } = usePlayerStore();

  const {
    videoRef,
    togglePlayPause,
    seek,
    changeQuality,
    toggleFullscreen,
    enterPiP,
    showControls,
  } = usePlayer({
    src,
    autoPlay,
    initialTime,
    onProgress,
    onEnded,
    onError,
    onUrlExpired,
  });

  // Reset player state on unmount
  React.useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Handle pointer activity for auto-hide (unified mouse+touch)
  const handlePointerMove = React.useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  const handlePointerLeave = React.useCallback(() => {
    // Keep controls visible briefly after pointer leaves
  }, []);

  // Double-tap seek gesture for mobile
  const handleTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('[data-controls]')) {
        return;
      }

      const now = Date.now();
      const touch = e.changedTouches[0];
      const lastTap = lastTapRef.current;

      if (now - lastTap.time < 300 && Math.abs(touch.clientX - lastTap.x) < 50) {
        // Double tap detected
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const third = rect.width / 3;

        if (tapX < third) {
          // Left third - seek back 10s
          seek(Math.max(0, usePlayerStore.getState().currentTime - 10));
          setSeekFeedback({ side: 'left', visible: true });
        } else if (tapX > third * 2) {
          // Right third - seek forward 10s
          seek(usePlayerStore.getState().currentTime + 10);
          setSeekFeedback({ side: 'right', visible: true });
        }

        // Hide feedback after brief display
        setTimeout(() => setSeekFeedback((prev) => ({ ...prev, visible: false })), 600);

        lastTapRef.current = { time: 0, x: 0 };
      } else {
        lastTapRef.current = { time: now, x: touch.clientX };
      }
    },
    [seek]
  );

  // Handle click on video area
  const handleVideoClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Don't toggle if clicking on controls
      if ((e.target as HTMLElement).closest('[data-controls]')) {
        return;
      }
      togglePlayPause();
      showControls();
    },
    [togglePlayPause, showControls]
  );

  // Handle double-click for fullscreen
  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      // Don't toggle if clicking on controls
      if ((e.target as HTMLElement).closest('[data-controls]')) {
        return;
      }
      toggleFullscreen();
    },
    [toggleFullscreen]
  );

  // Handle quality change
  const handleQualityChange = React.useCallback(
    (quality: VideoQuality) => {
      changeQuality(quality);
      setSettingsOpen(false);
    },
    [changeQuality, setSettingsOpen]
  );

  // Handle replay
  const handleReplay = React.useCallback(() => {
    seek(0);
    togglePlayPause();
  }, [seek, togglePlayPause]);

  // Disable right-click context menu
  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      data-player-container
      className={cn(
        'relative w-full aspect-video bg-black overflow-hidden group',
        'select-none touch-manipulation',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleVideoClick}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="w-full h-full object-contain"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture={false}
      />

      {/* Gradient overlays */}
      <PlayerGradientOverlay visible={isControlsVisible} />

      {/* Double-tap seek feedback */}
      {seekFeedback.visible && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20',
            'animate-fade-in',
            seekFeedback.side === 'left' ? 'left-8' : 'right-8'
          )}
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-sm font-medium">
              {seekFeedback.side === 'left' ? '-10s' : '+10s'}
            </span>
          </div>
        </div>
      )}

      {/* Center overlay (play/pause/buffering/error) */}
      <PlayerOverlay
        onPlayPause={togglePlayPause}
        onReplay={handleReplay}
      />

      {/* Top bar (title, close button) */}
      <div data-controls>
        <PlayerTopBar
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          visible={isControlsVisible}
        />
      </div>

      {/* Bottom controls */}
      <div data-controls>
        <PlayerControls
          title={title}
          onSeek={seek}
          onQualityChange={handleQualityChange}
          onToggleFullscreen={toggleFullscreen}
          onTogglePiP={enterPiP}
          onSkipBack={showSkipButtons ? () => {} : undefined}
          onSkipForward={showSkipButtons ? () => {} : undefined}
          showPiP={showPiP}
        />
      </div>
    </div>
  );
}

/**
 * Minimal video player (no controls, for previews/thumbnails)
 */
export function VideoPlayerMini({
  src,
  poster,
  autoPlay = false,
  muted = true,
  loop = false,
  className,
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // For mini player, just use native video
    video.src = src;

    if (autoPlay) {
      video.play().catch(() => {});
    }
  }, [src, autoPlay]);

  return (
    <div className={cn('relative w-full aspect-video bg-black overflow-hidden', className)}>
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline
        className="w-full h-full object-cover"
        controlsList="nodownload"
      />
    </div>
  );
}

/**
 * Video player loading skeleton
 */
export function VideoPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full aspect-video bg-mp-surface-2 animate-pulse', className)}>
      {/* Center play button skeleton */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-mp-surface-3" />
      </div>

      {/* Bottom controls skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="h-1 bg-mp-surface-3 rounded-full mb-4" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-mp-surface-3" />
            <div className="w-10 h-10 rounded-lg bg-mp-surface-3" />
            <div className="w-20 h-6 rounded bg-mp-surface-3" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-mp-surface-3" />
            <div className="w-8 h-8 rounded-lg bg-mp-surface-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
