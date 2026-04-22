'use client';

import { useCallback, useEffect, useRef } from 'react';
import Hls from 'hls.js';

import { usePlayerStore, type VideoQuality } from '@/stores/player.store';

interface UsePlayerOptions {
  src: string;
  autoPlay?: boolean;
  initialTime?: number;
  onProgress?: (time: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onUrlExpired?: () => void;
}

/**
 * Map HLS.js quality levels to our quality enum
 */
function mapQualityLevel(height: number): VideoQuality {
  if (height >= 2160) return '4k';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return '240p';
}

/**
 * HLS.js video player hook
 * Handles all video playback logic and syncs with Zustand store
 */
export function usePlayer({
  src,
  autoPlay = false,
  initialTime = 0,
  onProgress,
  onEnded,
  onError,
  onUrlExpired,
}: UsePlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store actions
  const {
    play,
    pause,
    setCurrentTime,
    setDuration,
    setBufferedTime,
    setBuffering,
    setEnded,
    setError,
    setVolume,
    setMuted,
    setQuality,
    setAvailableQualities,
    setFullscreen,
    setPictureInPicture,
    showControls,
    hideControls,
    updateActivity,
    isPlaying,
    volume,
    isMuted,
    playbackSpeed,
    isFullscreen,
    isControlsVisible,
  } = usePlayerStore();

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1, // Auto quality selection
        capLevelToPlayerSize: true, // Prevent loading 4K for small player
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        // Get available quality levels
        const qualities: VideoQuality[] = ['auto'];
        data.levels.forEach((level) => {
          const quality = mapQualityLevel(level.height);
          if (!qualities.includes(quality)) {
            qualities.push(quality);
          }
        });
        setAvailableQualities(qualities);

        // Auto-play if requested
        if (autoPlay) {
          video.play().catch(() => {
            // Auto-play was prevented, that's OK
          });
        }

        // Seek to initial time if provided
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          setQuality(mapQualityLevel(level.height));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Check for 403 — signed URL expired
              if (data.response?.code === 403) {
                onUrlExpired?.();
              } else {
                // Try to recover other network errors
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Cannot recover
              setError('Ошибка воспроизведения видео');
              onError?.('Ошибка воспроизведения видео');
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      if (autoPlay) {
        video.play().catch(() => {});
      }
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
      setAvailableQualities(['auto']);
    } else {
      setError('Ваш браузер не поддерживает HLS');
      onError?.('Ваш браузер не поддерживает HLS');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, initialTime, setAvailableQualities, setQuality, setError, onError, onUrlExpired]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => play();
    const handlePause = () => pause();
    const handleEnded = () => {
      setEnded(true);
      onEnded?.();
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    const handleDurationChange = () => {
      setDuration(video.duration);
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBufferedTime(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const handleError = () => {
      const error = video.error;
      const message = error?.message || 'Ошибка воспроизведения';
      setError(message);
      onError?.(message);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
    };
  }, [
    play,
    pause,
    setEnded,
    setCurrentTime,
    setDuration,
    setBufferedTime,
    setBuffering,
    setVolume,
    setMuted,
    setError,
    onEnded,
    onError,
  ]);

  // Progress tracking (debounced callback)
  useEffect(() => {
    if (!onProgress) return;

    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        onProgress(video.currentTime);
      }
    }, 10000); // Every 10 seconds

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [onProgress]);

  // Sync playback state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  // Sync volume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Sync playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Auto-hide controls
  useEffect(() => {
    if (!isControlsVisible) return;

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        hideControls();
      }
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isControlsVisible, isPlaying, hideControls]);

  // Quality change handler
  // Uses nextLevel for manual selection (smooth switch without buffer flush)
  // Uses currentLevel = -1 for returning to auto mode (per HLS.js docs)
  const changeQuality = useCallback(
    (newQuality: VideoQuality) => {
      const hls = hlsRef.current;
      if (!hls) return;

      if (newQuality === 'auto') {
        hls.currentLevel = -1; // Auto
      } else {
        const targetHeight =
          newQuality === '4k'
            ? 2160
            : newQuality === '1080p'
              ? 1080
              : newQuality === '720p'
                ? 720
                : newQuality === '480p'
                  ? 480
                  : 240;

        const levelIndex = hls.levels.findIndex((level) => level.height === targetHeight);
        if (levelIndex !== -1) {
          hls.nextLevel = levelIndex; // Smooth switch on next fragment
        }
      }
      setQuality(newQuality);
    },
    [setQuality]
  );

  // Seek handler
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, video.duration));
    setCurrentTime(video.currentTime);
  }, [setCurrentTime]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  // Fullscreen handlers
  const enterFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = video?.closest('[data-player-container]') as HTMLElement | null;
    if (!video) return;

    const tryEnterContainerFullscreen = async (): Promise<boolean> => {
      if (!container) return false;
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          return true;
        }
        const webkitRequestFullscreen = (container as unknown as { webkitRequestFullscreen?: () => Promise<void> })
          .webkitRequestFullscreen;
        if (webkitRequestFullscreen) {
          await webkitRequestFullscreen.call(container);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    const tryEnterVideoFullscreen = (): boolean => {
      const webkitEnterFullscreen = (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen;
      if (webkitEnterFullscreen) {
        try {
          webkitEnterFullscreen.call(video);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    };

    try {
      const didEnter = (await tryEnterContainerFullscreen()) || tryEnterVideoFullscreen();
      if (didEnter) {
        setFullscreen(true);
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, [setFullscreen]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      } else {
        const video = videoRef.current;
        const webkitExitFullscreen = (video as unknown as { webkitExitFullscreen?: () => void })?.webkitExitFullscreen;
        if (video && webkitExitFullscreen) {
          webkitExitFullscreen.call(video);
        }
      }
      setFullscreen(false);
    } catch {
      // Already exited fullscreen
    }
  }, [setFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Picture-in-Picture handlers
  const enterPiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    try {
      await video.requestPictureInPicture();
      setPictureInPicture(true);
    } catch {
      // PiP not supported or denied
    }
  }, [setPictureInPicture]);

  const exitPiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      setPictureInPicture(false);
    } catch {
      // Already exited PiP
    }
  }, [setPictureInPicture]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => setFullscreen(!!document.fullscreenElement);

    const video = videoRef.current;
    const handleWebkitBeginFullscreen = () => setFullscreen(true);
    const handleWebkitEndFullscreen = () => setFullscreen(false);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // iOS Safari uses video-specific events (document.fullscreenElement won't change)
    video?.addEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen as EventListener);
    video?.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);

      video?.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen as EventListener);
      video?.removeEventListener('webkitendfullscreen', handleWebkitEndFullscreen as EventListener);
    };
  }, [setFullscreen]);

  // PiP change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setPictureInPicture(true);
    const handleLeavePiP = () => setPictureInPicture(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [setPictureInPicture]);

  return {
    videoRef,
    // Actions
    togglePlayPause,
    seek,
    changeQuality,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    enterPiP,
    exitPiP,
    showControls,
    updateActivity,
  };
}
