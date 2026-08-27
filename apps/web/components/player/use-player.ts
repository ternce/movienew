"use client";

import { useCallback, useEffect, useRef } from "react";
import Hls from "hls.js";

import { usePlayerStore, type VideoQuality } from "@/stores/player.store";

interface UsePlayerOptions {
  src: string;
  autoPlay?: boolean;
  initialTime?: number;
  remoteCommand?: PlaybackRemoteCommand | null;
  onPlaybackAction?: (action: PlaybackLocalAction) => void;
  onTimeUpdate?: (time: number) => void;
  onProgress?: (
    time: number,
    reason?: "interval" | "pause" | "ended" | "visibilitychange" | "pagehide",
  ) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onUrlExpired?: () => void;
}

export type PlaybackRemoteCommand = {
  id: string | number;
  type: "state" | "play" | "pause" | "seek";
  currentTime: number;
  playbackStatus?: "PLAYING" | "PAUSED";
  playbackRate?: number;
};

export type PlaybackLocalAction = {
  type: "play" | "pause" | "seek";
  currentTime: number;
  playbackRate: number;
};

/**
 * Map HLS.js quality levels to our quality enum
 */
function mapQualityLevel(height: number): VideoQuality {
  if (height >= 2160) return "4k";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  return "240p";
}

const REMOTE_COMMAND_SEEK_THRESHOLD_SECONDS = 1.5;

/**
 * HLS.js video player hook
 * Handles all video playback logic and syncs with Zustand store
 */
export function usePlayer({
  src,
  autoPlay = false,
  initialTime = 0,
  remoteCommand,
  onPlaybackAction,
  onTimeUpdate,
  onProgress,
  onEnded,
  onError,
  onUrlExpired,
}: UsePlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedCallbackFiredRef = useRef(false);
  const suppressPlaybackActionRef = useRef(false);
  // Native media events fired while HLS is replacing/attaching a source are not
  // user playback intent. Treating those pause/play events as host commands can
  // create a PLAYING -> PAUSED feedback loop after Watch Party changes content.
  const sourceTransitionRef = useRef(false);
  const sourceTransitionReleaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTimeRef = useRef(initialTime);
  const autoPlayRef = useRef(autoPlay);
  const onErrorRef = useRef(onError);
  const onUrlExpiredRef = useRef(onUrlExpired);

  useEffect(() => {
    initialTimeRef.current = initialTime;
  }, [initialTime]);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onUrlExpiredRef.current = onUrlExpired;
  }, [onUrlExpired]);

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

    endedCallbackFiredRef.current = false;
    sourceTransitionRef.current = true;
    if (sourceTransitionReleaseRef.current) {
      clearTimeout(sourceTransitionReleaseRef.current);
      sourceTransitionReleaseRef.current = null;
    }

    const releaseSourceTransition = () => {
      if (sourceTransitionReleaseRef.current) {
        clearTimeout(sourceTransitionReleaseRef.current);
      }
      // Give the browser/HLS a short settling window after canplay. Chromium may
      // emit lifecycle play/pause events around MediaSource attachment.
      sourceTransitionReleaseRef.current = setTimeout(() => {
        sourceTransitionRef.current = false;
        sourceTransitionReleaseRef.current = null;
      }, 900);
    };

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
        const qualities: VideoQuality[] = ["auto"];
        data.levels.forEach((level) => {
          const quality = mapQualityLevel(level.height);
          if (!qualities.includes(quality)) {
            qualities.push(quality);
          }
        });
        setAvailableQualities(qualities);

        // Auto-play if requested
        if (autoPlayRef.current) {
          video.play().catch(() => {
            // Auto-play was prevented, that's OK
          });
        }

        // Seek to initial time only when a new media source is attached.
        const startTime = initialTimeRef.current;
        if (startTime > 0) {
          video.currentTime = startTime;
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
                onUrlExpiredRef.current?.();
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
              setError("Ошибка воспроизведения видео");
              onErrorRef.current?.("Ошибка воспроизведения видео");
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = src;
      if (autoPlayRef.current) {
        video.play().catch(() => {});
      }
      const startTime = initialTimeRef.current;
      if (startTime > 0) {
        video.currentTime = startTime;
      }
      setAvailableQualities(["auto"]);
    } else {
      setError("Ваш браузер не поддерживает HLS");
      onErrorRef.current?.("Ваш браузер не поддерживает HLS");
    }

    video.addEventListener("canplay", releaseSourceTransition, { once: true });

    return () => {
      video.removeEventListener("canplay", releaseSourceTransition);
      if (sourceTransitionReleaseRef.current) {
        clearTimeout(sourceTransitionReleaseRef.current);
        sourceTransitionReleaseRef.current = null;
      }
      sourceTransitionRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [
    src,
    setAvailableQualities,
    setQuality,
    setError,
  ]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const flushProgress = (reason: "pause" | "ended") => {
      if (Number.isFinite(video.currentTime)) {
        onProgress?.(video.currentTime, reason);
      }
    };
    const handlePlay = () => {
      // Media `play`/`pause` events are also emitted by HLS/browser lifecycle
      // changes (source replacement, MediaSource attach, recovery). They must
      // update local UI only. Watch Party host commands are emitted from the
      // explicit user control path in togglePlayPause below.
      play();
    };
    const handlePause = () => {
      pause();
      flushProgress("pause");
    };
    const handleEnded = () => {
      if (endedCallbackFiredRef.current) return;
      endedCallbackFiredRef.current = true;
      flushProgress("ended");
      setEnded(true);
      onEnded?.();
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
      if (
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >= video.duration - 0.5
      ) {
        handleEnded();
      }
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
      const message = error?.message || "Ошибка воспроизведения";
      setError(message);
      onError?.(message);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("error", handleError);
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
    onProgress,
    onTimeUpdate,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !remoteCommand) return;

    const targetTime = Number(remoteCommand.currentTime);
    const applyPlayback = async () => {
      suppressPlaybackActionRef.current = true;

      if (
        typeof remoteCommand.playbackRate === "number" &&
        remoteCommand.playbackRate > 0
      ) {
        video.playbackRate = remoteCommand.playbackRate;
      }

      if (Number.isFinite(targetTime)) {
        const duration = Number.isFinite(video.duration)
          ? video.duration
          : Number.POSITIVE_INFINITY;
        const nextTime = Math.max(0, Math.min(targetTime, duration));
        const drift = Math.abs(video.currentTime - nextTime);
        if (drift > REMOTE_COMMAND_SEEK_THRESHOLD_SECONDS) {
          video.currentTime = nextTime;
          setCurrentTime(video.currentTime);
        }
      }

      if (
        remoteCommand.type === "play" ||
        remoteCommand.playbackStatus === "PLAYING"
      ) {
        if (video.paused) {
          await video.play().catch(() => {});
        }
      } else if (
        remoteCommand.type === "pause" ||
        remoteCommand.playbackStatus === "PAUSED"
      ) {
        if (!video.paused) {
          video.pause();
        }
      }

      window.setTimeout(() => {
        suppressPlaybackActionRef.current = false;
      }, 250);
    };

    applyPlayback();
  }, [remoteCommand, setCurrentTime]);

  // Progress tracking (debounced callback)
  useEffect(() => {
    if (!onProgress) return;

    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        onProgress(video.currentTime, "interval");
      }
    }, 10000); // Every 10 seconds

    const flushLifecycleProgress = (
      reason: "visibilitychange" | "pagehide",
    ) => {
      const video = videoRef.current;
      if (
        video &&
        Number.isFinite(video.currentTime) &&
        video.currentTime > 0
      ) {
        onProgress(video.currentTime, reason);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushLifecycleProgress("visibilitychange");
      }
    };
    const handlePageHide = () => flushLifecycleProgress("pagehide");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [onProgress]);

  // IMPORTANT: do not drive the media element from Zustand `isPlaying`.
  //
  // The store mirrors native media state for UI only. Previously this effect
  // made the relationship bidirectional: native play/pause events updated the
  // store and any store transition immediately called video.play()/pause()
  // again. During a Watch Party content switch HLS emits several lifecycle
  // events while detaching/attaching MediaSource; the bidirectional loop could
  // then oscillate PLAYING/PAUSED for the entire newly selected video.
  //
  // Playback is now changed only by explicit user controls or an authoritative
  // remote Watch Party command. Native media events continue to update Zustand
  // so the controls remain accurate.

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

      if (newQuality === "auto") {
        hls.currentLevel = -1; // Auto
      } else {
        const targetHeight =
          newQuality === "4k"
            ? 2160
            : newQuality === "1080p"
              ? 1080
              : newQuality === "720p"
                ? 720
                : newQuality === "480p"
                  ? 480
                  : 240;

        const levelIndex = hls.levels.findIndex(
          (level) => level.height === targetHeight,
        );
        if (levelIndex !== -1) {
          hls.nextLevel = levelIndex; // Smooth switch on next fragment
        }
      }
      setQuality(newQuality);
    },
    [setQuality],
  );

  // Seek handler
  const seek = useCallback(
    (time: number, options?: { silent?: boolean }) => {
      const video = videoRef.current;
      if (!video) return;

      video.currentTime = Math.max(0, Math.min(time, video.duration));
      setCurrentTime(video.currentTime);
      if (
        !options?.silent &&
        !suppressPlaybackActionRef.current &&
        !sourceTransitionRef.current
      ) {
        onPlaybackAction?.({
          type: "seek",
          currentTime: video.currentTime,
          playbackRate: video.playbackRate || 1,
        });
      }
    },
    [onPlaybackAction, setCurrentTime],
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only an explicit user action is allowed to become a Watch Party playback
    // command. Native play/pause events can be generated by HLS while changing
    // sources and previously caused a PLAY/PAUSE feedback loop after starting a
    // poll winner.
    const nextType: "play" | "pause" = video.paused ? "play" : "pause";
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const playbackRate = video.playbackRate || 1;

    if (nextType === "play") {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    if (!sourceTransitionRef.current && !suppressPlaybackActionRef.current) {
      onPlaybackAction?.({
        type: nextType,
        currentTime,
        playbackRate,
      });
    }
  }, [onPlaybackAction]);

  // Fullscreen handlers
  const enterFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = video?.closest(
      "[data-player-container]",
    ) as HTMLElement | null;
    if (!video) return;

    const tryEnterContainerFullscreen = async (): Promise<boolean> => {
      if (!container) return false;
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          return true;
        }
        const webkitRequestFullscreen = (
          container as unknown as {
            webkitRequestFullscreen?: () => Promise<void>;
          }
        ).webkitRequestFullscreen;
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
      const webkitEnterFullscreen = (
        video as unknown as { webkitEnterFullscreen?: () => void }
      ).webkitEnterFullscreen;
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
      const didEnter =
        (await tryEnterContainerFullscreen()) || tryEnterVideoFullscreen();
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
      } else if (
        (document as unknown as { webkitExitFullscreen?: () => Promise<void> })
          .webkitExitFullscreen
      ) {
        await (
          document as unknown as { webkitExitFullscreen: () => Promise<void> }
        ).webkitExitFullscreen();
      } else {
        const video = videoRef.current;
        const webkitExitFullscreen = (
          video as unknown as { webkitExitFullscreen?: () => void }
        )?.webkitExitFullscreen;
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
    const handleFullscreenChange = () =>
      setFullscreen(!!document.fullscreenElement);

    const video = videoRef.current;
    const handleWebkitBeginFullscreen = () => setFullscreen(true);
    const handleWebkitEndFullscreen = () => setFullscreen(false);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    // iOS Safari uses video-specific events (document.fullscreenElement won't change)
    video?.addEventListener(
      "webkitbeginfullscreen",
      handleWebkitBeginFullscreen as EventListener,
    );
    video?.addEventListener(
      "webkitendfullscreen",
      handleWebkitEndFullscreen as EventListener,
    );

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );

      video?.removeEventListener(
        "webkitbeginfullscreen",
        handleWebkitBeginFullscreen as EventListener,
      );
      video?.removeEventListener(
        "webkitendfullscreen",
        handleWebkitEndFullscreen as EventListener,
      );
    };
  }, [setFullscreen]);

  // PiP change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setPictureInPicture(true);
    const handleLeavePiP = () => setPictureInPicture(false);

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
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
