"use client";

import { useCallback, useEffect, useRef } from "react";
import Hls from "hls.js";

import {
  isWatchPartyDiagnosticsEnabled,
  logWatchPartyDiagnostic,
} from "@/lib/watch-party-diagnostics";
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
  authoritativeCurrentTime?: number;
  playbackStatus?: "PLAYING" | "PAUSED";
  playbackRate?: number;
  serverTime?: string;
  serverClockOffsetMs?: number;
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

const PLAYING_DRIFT_IGNORE_SECONDS = 0.15;
const PLAYING_DRIFT_HARD_SECONDS = 0.75;
const PAUSED_DRIFT_EPSILON_SECONDS = 0.025;
const SOFT_CORRECTION_RATE_DELTA = 0.03;
const SOFT_CORRECTION_DURATION_MS = 1600;
const ENDED_REPLAY_EPSILON_SECONDS = 0.5;
const PLAYING_DRIFT_SOFT_SECONDS = 0.5;
const PLAYING_DRIFT_STRONG_SOFT_SECONDS = 1.25;
const STRONG_SOFT_CORRECTION_RATE_DELTA = 0.055;

function getRemotePlaybackStatus(command: PlaybackRemoteCommand) {
  if (command.type === "play") return "PLAYING";
  if (command.type === "pause") return "PAUSED";
  return command.playbackStatus;
}

function hasMetadata(video: HTMLVideoElement) {
  return video.readyState >= 1 || Number.isFinite(video.duration);
}

function getClampedPlaybackTime(video: HTMLVideoElement, time: number) {
  if (!Number.isFinite(time)) return 0;
  const duration = Number.isFinite(video.duration)
    ? video.duration
    : Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(time, duration));
}

function getCommandPlaybackRate(command: PlaybackRemoteCommand) {
  return typeof command.playbackRate === "number" && command.playbackRate > 0
    ? command.playbackRate
    : 1;
}

function getCommandTargetTime(command: PlaybackRemoteCommand) {
  const status = getRemotePlaybackStatus(command);
  const baseTime =
    typeof command.authoritativeCurrentTime === "number"
      ? command.authoritativeCurrentTime
      : command.currentTime;

  if (status !== "PLAYING") return baseTime;

  const serverTimeMs = command.serverTime ? Date.parse(command.serverTime) : Number.NaN;
  if (!Number.isFinite(serverTimeMs)) return command.currentTime;

  const serverNowMs = Date.now() + (command.serverClockOffsetMs || 0);
  const elapsedSeconds = Math.max(0, (serverNowMs - serverTimeMs) / 1000);
  return baseTime + elapsedSeconds * getCommandPlaybackRate(command);
}

function shouldRestartEndedPlayback(video: HTMLVideoElement, targetTime: number) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return video.ended;
  }

  return (
    video.ended ||
    (video.currentTime >= video.duration - ENDED_REPLAY_EPSILON_SECONDS &&
      targetTime >= video.duration - ENDED_REPLAY_EPSILON_SECONDS)
  );
}

function isAutoplayBlockedError(error: unknown) {
  const name =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.name
        : "";
  return name === "NotAllowedError";
}

const AUTOPLAY_BLOCKED_MESSAGE = "Нажмите, чтобы синхронизировать воспроизведение";

type RemoteStartupCommand = {
  command: PlaybackRemoteCommand;
  version: number;
  sourceVersion: number;
  requestedAt: number;
  lastTarget: number | null;
  awaitingProgress: boolean;
  playRequested: boolean;
  lastObservedTime: number;
};

type SyncCorrectionType =
  | "IGNORE"
  | "SOFT"
  | "STRONG_SOFT"
  | "HARD"
  | "KEEP"
  | "UPGRADE"
  | "DOWNGRADE"
  | "COMPLETE"
  | "REVERSE";
type PlaybackEngine = "hls.js" | "native-hls" | "native-file";
type SyncCorrectionDirection = "behind" | "ahead";

type ActiveSyncCorrection = {
  baseRate: number;
  effectiveRate: number;
  direction: SyncCorrectionDirection;
  type: Extract<SyncCorrectionType, "SOFT" | "STRONG_SOFT">;
  sourceVersion: number;
  sequence: string | null;
  generation: number;
};

type MediaRecoveryState = {
  sourceVersion: number;
  sequence: string | null;
  enteredAt: number;
  lastTime: number;
};

function getNowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function getCorrectionReason(command: PlaybackRemoteCommand) {
  const id = String(command.id);
  if (id.includes(":sync:")) return "sync";
  if (id.includes(":state:")) return "passive-state";
  return command.type;
}

function isPassivePlayingSnapshot(command: PlaybackRemoteCommand) {
  return command.type === "state" && getRemotePlaybackStatus(command) === "PLAYING";
}

function logSyncCorrection(details: {
  reason: string;
  type: SyncCorrectionType;
  local: number;
  target: number;
  drift: number;
  rateBefore: number;
  rateAfter: number;
  command: PlaybackRemoteCommand;
  playbackEngine: PlaybackEngine;
}) {
  if (!isWatchPartyDiagnosticsEnabled()) return;
  const browser = getBrowserDiagnostics();
  logWatchPartyDiagnostic("[WP Sync Correction]", {
    reason: details.reason,
    type: details.type,
    playbackEngine: details.playbackEngine,
    isIOS: browser.isIOS,
    isSafari: browser.isSafari,
    userAgentSummary: browser.userAgentSummary,
    userAgent: browser.userAgent,
    driftMs: Math.round(Math.abs(details.drift) * 1000),
    local: Number(details.local.toFixed(3)),
    target: Number(details.target.toFixed(3)),
    rate: Number(details.rateAfter.toFixed(3)),
    rateBefore: Number(details.rateBefore.toFixed(3)),
    sequence: String(details.command.id).split(":")[0],
    status: getRemotePlaybackStatus(details.command) || "unknown",
    at: new Date().toISOString(),
  });
}

function getRemoteSequence(command?: PlaybackRemoteCommand | null) {
  if (!command) return null;
  const sequence = String(command.id).split(":")[0];
  return sequence || null;
}

function getDiagnosticTarget(command?: PlaybackRemoteCommand | null) {
  if (!command) return null;
  const target = Number(getCommandTargetTime(command));
  return Number.isFinite(target) ? target : null;
}

function getBrowserDiagnostics() {
  if (typeof navigator === "undefined") {
    return {
      userAgent: "unknown",
      userAgentSummary: "unknown",
      isIOS: false,
      isSafari: false,
    };
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  const isSafari =
    /Safari/.test(userAgent) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|EdgiOS|OPiOS/.test(userAgent);

  return {
    userAgent,
    userAgentSummary: [
      isIOS ? "iOS" : "non-iOS",
      isSafari ? "Safari" : "non-Safari",
    ].join(" "),
    isIOS,
    isSafari,
  };
}

function getBufferedSnapshot(video: HTMLVideoElement) {
  const snapshot = {
    bufferedLength: video.buffered.length,
    bufferedStart: null as number | null,
    bufferedEnd: null as number | null,
    bufferAheadSeconds: null as number | null,
  };

  for (let index = 0; index < video.buffered.length; index += 1) {
    try {
      const start = video.buffered.start(index);
      const end = video.buffered.end(index);
      if (video.currentTime >= start && video.currentTime <= end) {
        snapshot.bufferedStart = Number(start.toFixed(3));
        snapshot.bufferedEnd = Number(end.toFixed(3));
        snapshot.bufferAheadSeconds = Number((end - video.currentTime).toFixed(3));
        return snapshot;
      }
    } catch {
      return snapshot;
    }
  }

  return snapshot;
}

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
  const remoteCommandVersionRef = useRef(0);
  const latestRemoteCommandRef = useRef<PlaybackRemoteCommand | null>(null);
  const pendingRemoteCommandRef = useRef<PlaybackRemoteCommand | null>(null);
  const remoteStartupCommandRef = useRef<RemoteStartupCommand | null>(null);
  const sourceVersionRef = useRef(0);
  const playbackEngineRef = useRef<PlaybackEngine>("native-file");
  const authoritativeBaseRateRef = useRef(1);
  const activeCorrectionRef = useRef<ActiveSyncCorrection | null>(null);
  const correctionGenerationRef = useRef(0);
  const mediaRecoveryRef = useRef<MediaRecoveryState | null>(null);
  const softCorrectionBaseRateRef = useRef<number | null>(null);
  const softCorrectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastTimeUpdateTraceAtRef = useRef(0);
  const correctionTraceUntilRef = useRef(0);
  const lastMediaEventRef = useRef<string | null>(null);
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
    setAutoplayBlocked,
    setPlayPending,
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
    isSettingsOpen,
    volume,
    isMuted,
    playbackSpeed,
    isFullscreen,
    isControlsVisible,
  } = usePlayerStore();

  const getMediaDiagnosticFields = useCallback(
    (video: HTMLVideoElement, command = latestRemoteCommandRef.current) => {
      const target = getDiagnosticTarget(command);
      const buffered = getBufferedSnapshot(video);
      const browser = getBrowserDiagnostics();
      const driftMs =
        typeof target === "number"
          ? Math.round((target - video.currentTime) * 1000)
          : null;

      return {
        atMs: Math.round(getNowMs()),
        playbackEngine: playbackEngineRef.current,
        isIOS: browser.isIOS,
        isSafari: browser.isSafari,
        userAgentSummary: browser.userAgentSummary,
        userAgent: browser.userAgent,
        currentTime: Number(video.currentTime.toFixed(3)),
        paused: video.paused,
        readyState: video.readyState,
        networkState: video.networkState,
        playbackRate: Number(video.playbackRate.toFixed(3)),
        seeking: video.seeking,
        roomStatus: command ? getRemotePlaybackStatus(command) || null : null,
        target: typeof target === "number" ? Number(target.toFixed(3)) : null,
        driftMs,
        sequence: getRemoteSequence(command),
        remoteType: command?.type || null,
        softCorrectionActive: softCorrectionTimerRef.current !== null,
        mediaRecoveryActive: mediaRecoveryRef.current !== null,
        playRecoveryPending: remoteStartupCommandRef.current?.awaitingProgress || false,
        correctionRate:
          softCorrectionTimerRef.current !== null
            ? Number(video.playbackRate.toFixed(3))
            : null,
        sourceVersion: sourceVersionRef.current,
        bufferedLength: buffered.bufferedLength,
        bufferedStart: buffered.bufferedStart,
        bufferedEnd: buffered.bufferedEnd,
        bufferAheadSeconds: buffered.bufferAheadSeconds,
        lastMediaEvent: lastMediaEventRef.current,
      };
    },
    [],
  );

  const logMediaEvent = useCallback(
    (eventName: string, options?: { force?: boolean }) => {
      const video = videoRef.current;
      if (!video || !isWatchPartyDiagnosticsEnabled()) return;

      const now = getNowMs();
      if (
        eventName === "timeupdate" &&
        !options?.force &&
        now - lastTimeUpdateTraceAtRef.current < 1000 &&
        now > correctionTraceUntilRef.current
      ) {
        return;
      }

      if (eventName === "timeupdate") {
        lastTimeUpdateTraceAtRef.current = now;
      }
      lastMediaEventRef.current = eventName;
      logWatchPartyDiagnostic("[WP MEDIA EVENT]", {
        event: eventName,
        ...getMediaDiagnosticFields(video),
      });
    },
    [getMediaDiagnosticFields],
  );

  const logMediaMutation = useCallback(
    (
      action: string,
      reason: string,
      extra: Record<string, unknown> = {},
      command = latestRemoteCommandRef.current,
    ) => {
      const video = videoRef.current;
      if (!video || !isWatchPartyDiagnosticsEnabled()) return;

      logWatchPartyDiagnostic("[WP MEDIA MUTATION]", {
        action,
        reason,
        ...extra,
        ...getMediaDiagnosticFields(video, command),
      });
    },
    [getMediaDiagnosticFields],
  );

  const clearSoftCorrection = useCallback(
    (playbackRate?: number) => {
      if (softCorrectionTimerRef.current) {
        clearTimeout(softCorrectionTimerRef.current);
        softCorrectionTimerRef.current = null;
      }
      correctionGenerationRef.current += 1;

      const targetRate = playbackRate ?? softCorrectionBaseRateRef.current;
      const video = videoRef.current;
      if (
        video &&
        typeof targetRate === "number" &&
        targetRate > 0 &&
        video.playbackRate !== targetRate
      ) {
        const previousRate = video.playbackRate;
        video.playbackRate = targetRate;
        logMediaMutation("playbackRate", "clear-soft-correction", {
          from: Number(previousRate.toFixed(3)),
          to: Number(targetRate.toFixed(3)),
        });
      }
      softCorrectionBaseRateRef.current = null;
      activeCorrectionRef.current = null;
    },
    [logMediaMutation],
  );

  const setAuthoritativeBaseRate = useCallback(
    (
      playbackRate: number,
      reason: string,
      command: PlaybackRemoteCommand,
    ) => {
      const video = videoRef.current;
      if (!video || playbackRate <= 0) return;

      authoritativeBaseRateRef.current = playbackRate;
      softCorrectionBaseRateRef.current = playbackRate;
      if (activeCorrectionRef.current) {
        activeCorrectionRef.current.baseRate = playbackRate;
        return;
      }

      if (video.playbackRate === playbackRate) return;
      const rateBefore = video.playbackRate;
      video.playbackRate = playbackRate;
      logMediaMutation("playbackRate", reason, {
        from: Number(rateBefore.toFixed(3)),
        to: Number(playbackRate.toFixed(3)),
      }, command);
    },
    [logMediaMutation],
  );

  const applySoftCorrection = useCallback(
    (
      baseRate: number,
      drift: number,
      type: Extract<SyncCorrectionType, "SOFT" | "STRONG_SOFT">,
      command: PlaybackRemoteCommand,
    ) => {
      const video = videoRef.current;
      if (!video) return;

      const rateDelta =
        type === "STRONG_SOFT"
          ? STRONG_SOFT_CORRECTION_RATE_DELTA
          : SOFT_CORRECTION_RATE_DELTA;
      const direction: SyncCorrectionDirection = drift > 0 ? "behind" : "ahead";
      const correctionRate =
        baseRate * (direction === "behind" ? 1 + rateDelta : 1 - rateDelta);
      const effectiveRate = Math.max(0.1, correctionRate);
      const activeCorrection = activeCorrectionRef.current;

      if (activeCorrection && activeCorrection.direction === direction) {
        activeCorrection.baseRate = baseRate;
        activeCorrection.sequence = getRemoteSequence(command);
        if (
          activeCorrection.type === type ||
          (activeCorrection.type === "STRONG_SOFT" && type === "SOFT")
        ) {
          logSyncCorrection({
            reason: getCorrectionReason(command),
            type: activeCorrection.type === type ? "KEEP" : "DOWNGRADE",
            local: video.currentTime,
            target: getClampedPlaybackTime(video, getCommandTargetTime(command)),
            drift,
            rateBefore: video.playbackRate,
            rateAfter: video.playbackRate,
            command,
            playbackEngine: playbackEngineRef.current,
          });
          return;
        }
      }

      const generation = correctionGenerationRef.current + 1;
      correctionGenerationRef.current = generation;
      if (softCorrectionTimerRef.current) {
        clearTimeout(softCorrectionTimerRef.current);
        softCorrectionTimerRef.current = null;
      }
      softCorrectionBaseRateRef.current = baseRate;
      const previousRate = video.playbackRate;
      video.playbackRate = effectiveRate;
      activeCorrectionRef.current = {
        baseRate,
        effectiveRate,
        direction,
        type,
        sourceVersion: sourceVersionRef.current,
        sequence: getRemoteSequence(command),
        generation,
      };
      correctionTraceUntilRef.current = getNowMs() + SOFT_CORRECTION_DURATION_MS + 500;
      const lifecycleType: SyncCorrectionType | null =
        activeCorrection && activeCorrection.direction !== direction
          ? "REVERSE"
          : activeCorrection?.type === "SOFT" && type === "STRONG_SOFT"
            ? "UPGRADE"
            : null;
      const reason =
        lifecycleType === "REVERSE"
          ? "reverse-soft-correction"
          : lifecycleType === "UPGRADE"
            ? "upgrade-soft-correction"
            : type === "STRONG_SOFT"
              ? "strong-soft-correction"
              : "soft-correction";
      logMediaMutation(
        "playbackRate",
        reason,
        {
          from: Number(previousRate.toFixed(3)),
          to: Number(video.playbackRate.toFixed(3)),
          driftMs: Math.round(drift * 1000),
        },
        command,
      );
      if (lifecycleType) {
        logSyncCorrection({
          reason: getCorrectionReason(command),
          type: lifecycleType,
          local: video.currentTime,
          target: getClampedPlaybackTime(video, getCommandTargetTime(command)),
          drift,
          rateBefore: previousRate,
          rateAfter: video.playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
      }
      softCorrectionTimerRef.current = setTimeout(() => {
        const latestCorrection = activeCorrectionRef.current;
        if (
          videoRef.current === video &&
          latestCorrection?.generation === generation &&
          latestCorrection.sourceVersion === sourceVersionRef.current
        ) {
          const rateBeforeReset = video.playbackRate;
          const targetRate = latestCorrection.baseRate;
          if (rateBeforeReset !== targetRate) {
            video.playbackRate = targetRate;
            logMediaMutation("playbackRate", "soft-correction-expired", {
              from: Number(rateBeforeReset.toFixed(3)),
              to: Number(targetRate.toFixed(3)),
            }, command);
          }
          activeCorrectionRef.current = null;
          softCorrectionBaseRateRef.current = null;
        }
        softCorrectionTimerRef.current = null;
      }, SOFT_CORRECTION_DURATION_MS);
    },
    [logMediaMutation],
  );

  const reconcilePlayingToRemoteTarget = useCallback(
    (command: PlaybackRemoteCommand, forceSnap = false) => {
      const video = videoRef.current;
      if (!video) return;

      const targetTime = Number(getCommandTargetTime(command));
      const playbackRate = getCommandPlaybackRate(command);
      const rateBefore = video.playbackRate || playbackRate;
      setAuthoritativeBaseRate(playbackRate, "remote-playing-base-rate", command);

      if (!Number.isFinite(targetTime)) return;

      let nextTime = getClampedPlaybackTime(video, targetTime);
      if (shouldRestartEndedPlayback(video, nextTime)) {
        nextTime = 0;
        endedCallbackFiredRef.current = false;
        setEnded(false);
      }

      const localTime = video.currentTime;
      const drift = nextTime - localTime;
      const absDrift = Math.abs(drift);
      const reason = getCorrectionReason(command);
      const isPassiveHealthyPlayback =
        command.type === "state" && !forceSnap && !video.ended;
      const pendingPlay = remoteStartupCommandRef.current;
      const isPendingPlayRecovery =
        pendingPlay?.awaitingProgress &&
        pendingPlay.sourceVersion === sourceVersionRef.current &&
        isPassivePlayingSnapshot(command);
      const isMediaRecoveryActive =
        mediaRecoveryRef.current?.sourceVersion === sourceVersionRef.current &&
        isPassivePlayingSnapshot(command);

      if (isPendingPlayRecovery || isMediaRecoveryActive) {
        logSyncCorrection({
          reason: isPendingPlayRecovery ? "play-recovery" : "media-recovery",
          type: "IGNORE",
          local: localTime,
          target: nextTime,
          drift,
          rateBefore,
          rateAfter: video.playbackRate || playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
        return;
      }

      if (isPassiveHealthyPlayback && video.readyState < 3 && absDrift <= PLAYING_DRIFT_STRONG_SOFT_SECONDS) {
        logSyncCorrection({
          reason,
          type: "IGNORE",
          local: localTime,
          target: nextTime,
          drift,
          rateBefore,
          rateAfter: video.playbackRate || playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
        return;
      }

      if (forceSnap || absDrift > PLAYING_DRIFT_STRONG_SOFT_SECONDS || video.ended) {
        clearSoftCorrection(playbackRate);
        logMediaMutation("currentTime", "remote-playing-hard-correction", {
          from: Number(localTime.toFixed(3)),
          to: Number(nextTime.toFixed(3)),
          driftMs: Math.round(drift * 1000),
        }, command);
        video.currentTime = nextTime;
        setCurrentTime(video.currentTime);
        logSyncCorrection({
          reason,
          type: "HARD",
          local: localTime,
          target: nextTime,
          drift,
          rateBefore,
          rateAfter: video.playbackRate || playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
      } else if (absDrift > PLAYING_DRIFT_SOFT_SECONDS) {
        applySoftCorrection(playbackRate, drift, "STRONG_SOFT", command);
        logSyncCorrection({
          reason,
          type: "STRONG_SOFT",
          local: localTime,
          target: nextTime,
          drift,
          rateBefore,
          rateAfter: video.playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
      } else if (absDrift > PLAYING_DRIFT_IGNORE_SECONDS) {
        applySoftCorrection(playbackRate, drift, "SOFT", command);
        logSyncCorrection({
          reason,
          type: "SOFT",
          local: localTime,
          target: nextTime,
          drift,
          rateBefore,
          rateAfter: video.playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
      } else {
        logSyncCorrection({
          reason,
          type: "IGNORE",
          local: localTime,
          target: nextTime,
          drift,
          rateBefore,
          rateAfter: video.playbackRate || playbackRate,
          command,
          playbackEngine: playbackEngineRef.current,
        });
        if (activeCorrectionRef.current) {
          clearSoftCorrection(playbackRate);
          logSyncCorrection({
            reason,
            type: "COMPLETE",
            local: localTime,
            target: nextTime,
            drift,
            rateBefore,
            rateAfter: video.playbackRate || playbackRate,
            command,
            playbackEngine: playbackEngineRef.current,
          });
        }
      }
    },
    [applySoftCorrection, clearSoftCorrection, logMediaMutation, setAuthoritativeBaseRate, setCurrentTime, setEnded],
  );

  const applyRemotePlaybackCommand = useCallback(
    async (command: PlaybackRemoteCommand, version: number) => {
      const video = videoRef.current;
      if (!video) return;

      const status = getRemotePlaybackStatus(command);
      const targetTime = Number(getCommandTargetTime(command));
      const playbackRate = getCommandPlaybackRate(command);
      suppressPlaybackActionRef.current = true;

      setAuthoritativeBaseRate(playbackRate, "remote-command-base-rate", command);

      if (!hasMetadata(video)) {
        pendingRemoteCommandRef.current = command;
        if (status === "PAUSED") {
          mediaRecoveryRef.current = null;
          remoteStartupCommandRef.current = null;
          clearSoftCorrection(playbackRate);
        }
        if (status === "PAUSED" && !video.paused) {
          logMediaMutation("pause", "remote-paused-before-metadata", {}, command);
          video.pause();
        }
        return;
      }

      pendingRemoteCommandRef.current = null;

      if (Number.isFinite(targetTime)) {
        let nextTime = getClampedPlaybackTime(video, targetTime);
        if (status === "PLAYING" && shouldRestartEndedPlayback(video, nextTime)) {
          nextTime = 0;
          endedCallbackFiredRef.current = false;
          setEnded(false);
        }

        const drift = Math.abs(video.currentTime - nextTime);
        if (status === "PAUSED" || command.type === "seek") {
          mediaRecoveryRef.current = null;
          remoteStartupCommandRef.current = null;
          clearSoftCorrection(playbackRate);
          if (drift > PAUSED_DRIFT_EPSILON_SECONDS || video.ended) {
            logMediaMutation("currentTime", command.type === "seek" ? "remote-seek" : "remote-paused-snap", {
              from: Number(video.currentTime.toFixed(3)),
              to: Number(nextTime.toFixed(3)),
              driftMs: Math.round((nextTime - video.currentTime) * 1000),
            }, command);
            video.currentTime = nextTime;
            setCurrentTime(video.currentTime);
          }
        } else if (status === "PLAYING" && (video.paused || video.ended)) {
          const pendingPlay = remoteStartupCommandRef.current;
          const shouldAlign =
            !pendingPlay ||
            command.type === "play" ||
            video.ended;
          if (shouldAlign && (drift > PAUSED_DRIFT_EPSILON_SECONDS || video.ended)) {
            clearSoftCorrection(playbackRate);
            logMediaMutation("currentTime", "remote-playing-start-alignment", {
              from: Number(video.currentTime.toFixed(3)),
              to: Number(nextTime.toFixed(3)),
              driftMs: Math.round((nextTime - video.currentTime) * 1000),
            }, command);
            video.currentTime = nextTime;
            setCurrentTime(video.currentTime);
          }
        } else if (status === "PLAYING") {
          reconcilePlayingToRemoteTarget(command, command.type === "play");
        } else if (drift > PLAYING_DRIFT_HARD_SECONDS || video.ended) {
          clearSoftCorrection(playbackRate);
          logMediaMutation("currentTime", "remote-nonplaying-hard-correction", {
            from: Number(video.currentTime.toFixed(3)),
            to: Number(nextTime.toFixed(3)),
            driftMs: Math.round((nextTime - video.currentTime) * 1000),
          }, command);
          video.currentTime = nextTime;
          setCurrentTime(video.currentTime);
        }
      }

      if (status === "PLAYING") {
        if (video.paused || video.ended) {
          const pendingPlay = remoteStartupCommandRef.current;
          const shouldRequestPlay =
            !pendingPlay ||
            pendingPlay.sourceVersion !== sourceVersionRef.current ||
            !pendingPlay.playRequested ||
            command.type === "play";
          remoteStartupCommandRef.current = {
            command,
            version,
            sourceVersion: sourceVersionRef.current,
            requestedAt: pendingPlay?.requestedAt ?? getNowMs(),
            lastTarget: Number.isFinite(targetTime)
              ? getClampedPlaybackTime(video, targetTime)
              : pendingPlay?.lastTarget ?? null,
            awaitingProgress: true,
            playRequested: pendingPlay?.playRequested || shouldRequestPlay,
            lastObservedTime: video.currentTime,
          };
          setPlayPending(true);
          logWatchPartyDiagnostic("[WP PLAY RECOVERY]", {
            event: "START",
            alreadyPending: Boolean(pendingPlay),
            playRequested: shouldRequestPlay,
            ...getMediaDiagnosticFields(video, command),
            sequence: getRemoteSequence(command),
            sourceVersion: sourceVersionRef.current,
          });
          if (!shouldRequestPlay) {
            return;
          }
          logMediaMutation("play", "remote-playing-command", {}, command);
          await video.play().catch((error: unknown) => {
            if (version !== remoteCommandVersionRef.current) return;
            if (isAutoplayBlockedError(error)) {
              pendingRemoteCommandRef.current = command;
              logWatchPartyDiagnostic("[WP PLAY RECOVERY]", {
                event: "BLOCKED",
                ...getMediaDiagnosticFields(video, command),
                sequence: getRemoteSequence(command),
                sourceVersion: sourceVersionRef.current,
              });
              setAutoplayBlocked(AUTOPLAY_BLOCKED_MESSAGE);
            } else {
              setError("Ошибка воспроизведения");
            }
          });
          if (version !== remoteCommandVersionRef.current) {
            const latestCommand = latestRemoteCommandRef.current;
            if (
              latestCommand &&
              getRemotePlaybackStatus(latestCommand) === "PAUSED" &&
              !video.paused
            ) {
              logMediaMutation("pause", "remote-latest-paused-after-stale-play", {}, latestCommand);
              video.pause();
            }
            return;
          }
        }
      } else if (status === "PAUSED") {
        mediaRecoveryRef.current = null;
        pendingRemoteCommandRef.current = null;
        if (remoteStartupCommandRef.current) {
          logWatchPartyDiagnostic("[WP PLAY RECOVERY]", {
            event: "CANCEL",
            reason: "pause",
            ...getMediaDiagnosticFields(video, command),
            sequence: getRemoteSequence(command),
            sourceVersion: sourceVersionRef.current,
          });
        }
        remoteStartupCommandRef.current = null;
        clearSoftCorrection(playbackRate);
        if (!video.paused) {
          logMediaMutation("pause", "remote-paused-command", {}, command);
          video.pause();
        } else {
          setPlayPending(false);
        }
      }

      if (version === remoteCommandVersionRef.current) {
        window.setTimeout(() => {
          if (version === remoteCommandVersionRef.current) {
            suppressPlaybackActionRef.current = false;
          }
        }, 250);
      }
    },
    [
      clearSoftCorrection,
      getMediaDiagnosticFields,
      logMediaMutation,
      reconcilePlayingToRemoteTarget,
      setAuthoritativeBaseRate,
      setAutoplayBlocked,
      setCurrentTime,
      setEnded,
      setError,
      setPlayPending,
    ],
  );

  const retryBlockedAutoplay = useCallback(() => {
    const command = pendingRemoteCommandRef.current;
    if (!command || getRemotePlaybackStatus(command) !== "PLAYING") return false;
    const version = remoteCommandVersionRef.current;
    void applyRemotePlaybackCommand(command, version);
    return true;
  }, [applyRemotePlaybackCommand]);

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    endedCallbackFiredRef.current = false;
    sourceTransitionRef.current = true;
    sourceVersionRef.current += 1;
    pendingRemoteCommandRef.current = null;
    remoteStartupCommandRef.current = null;
    mediaRecoveryRef.current = null;
    setError(null);
    setAutoplayBlocked(null);
    setPlayPending(false);
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

    const logPlayerEngine = (playbackEngine: PlaybackEngine) => {
      playbackEngineRef.current = playbackEngine;
      if (!isWatchPartyDiagnosticsEnabled()) return;
      const browser = getBrowserDiagnostics();
      logWatchPartyDiagnostic("[WP PLAYER]", {
        event: "engine-selected",
        playbackEngine,
        isIOS: browser.isIOS,
        isSafari: browser.isSafari,
        userAgentSummary: browser.userAgentSummary,
        userAgent: browser.userAgent,
        sourceVersion: sourceVersionRef.current,
        src,
      });
    };

    // Clean up previous instance
    if (hlsRef.current) {
      logMediaMutation("hls.destroy", "source-change-cleanup");
      hlsRef.current.destroy();
    }

    // Check if HLS is supported
    if (Hls.isSupported()) {
      logPlayerEngine("hls.js");
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1, // Auto quality selection
        capLevelToPlayerSize: true, // Prevent loading 4K for small player
      });

      logMediaMutation("hls.loadSource", "source-init", { src });
      hls.loadSource(src);
      logMediaMutation("hls.attachMedia", "source-init", { src });
      hls.attachMedia(video);

      [
        Hls.Events.FRAG_LOADING,
        Hls.Events.FRAG_LOADED,
        Hls.Events.FRAG_BUFFERED,
        Hls.Events.BUFFER_APPENDING,
        Hls.Events.BUFFER_APPENDED,
        Hls.Events.ERROR,
      ].forEach((eventName) => {
        hls.on(eventName, (_event: unknown, data: unknown) => {
          const browser = getBrowserDiagnostics();
          const buffered = getBufferedSnapshot(video);
          logWatchPartyDiagnostic("[WP HLS]", {
            event: eventName,
            atMs: Math.round(getNowMs()),
            playbackEngine: playbackEngineRef.current,
            isIOS: browser.isIOS,
            isSafari: browser.isSafari,
            userAgentSummary: browser.userAgentSummary,
            userAgent: browser.userAgent,
            sourceVersion: sourceVersionRef.current,
            currentTime: Number(video.currentTime.toFixed(3)),
            paused: video.paused,
            readyState: video.readyState,
            networkState: video.networkState,
            playbackRate: Number(video.playbackRate.toFixed(3)),
            seeking: video.seeking,
            bufferedLength: buffered.bufferedLength,
            bufferedStart: buffered.bufferedStart,
            bufferedEnd: buffered.bufferedEnd,
            bufferAheadSeconds: buffered.bufferAheadSeconds,
            sequence: getRemoteSequence(latestRemoteCommandRef.current),
            type: typeof data === "object" && data && "type" in data ? data.type : undefined,
            details: typeof data === "object" && data && "details" in data ? data.details : undefined,
            fatal: typeof data === "object" && data && "fatal" in data ? data.fatal : undefined,
          });
        });
      });

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
          logMediaMutation("play", "manifest-parsed-autoplay");
          video.play().catch(() => {
            // Auto-play was prevented, that's OK
          });
        }

        // Seek to initial time only when a new media source is attached.
        const startTime = initialTimeRef.current;
        if (startTime > 0) {
          logMediaMutation("currentTime", "initial-time-after-manifest", {
            from: Number(video.currentTime.toFixed(3)),
            to: Number(startTime.toFixed(3)),
          });
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
                logMediaMutation("hls.startLoad", "hls-network-error-recovery");
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              logMediaMutation("hls.recoverMediaError", "hls-media-error-recovery");
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
      logPlayerEngine("native-hls");
      logMediaMutation("src", "native-hls-source-init", { src });
      video.src = src;
      if (autoPlayRef.current) {
        logMediaMutation("play", "native-hls-autoplay");
        video.play().catch(() => {});
      }
      const startTime = initialTimeRef.current;
      if (startTime > 0) {
        logMediaMutation("currentTime", "native-hls-initial-time", {
          from: Number(video.currentTime.toFixed(3)),
          to: Number(startTime.toFixed(3)),
        });
        video.currentTime = startTime;
      }
      setAvailableQualities(["auto"]);
    } else {
      setError("Ваш браузер не поддерживает HLS");
      onErrorRef.current?.("Ваш браузер не поддерживает HLS");
    }

    video.addEventListener("canplay", releaseSourceTransition, { once: true });

    return () => {
      clearSoftCorrection();
      video.removeEventListener("canplay", releaseSourceTransition);
      if (sourceTransitionReleaseRef.current) {
        clearTimeout(sourceTransitionReleaseRef.current);
        sourceTransitionReleaseRef.current = null;
      }
      sourceTransitionRef.current = false;
      if (hlsRef.current) {
        logMediaMutation("hls.destroy", "source-effect-cleanup");
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [
    src,
    clearSoftCorrection,
    logMediaMutation,
    setAvailableQualities,
    setQuality,
    setError,
    setAutoplayBlocked,
    setPlayPending,
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
      logMediaEvent("play", { force: true });
      // Media `play`/`pause` events are also emitted by HLS/browser lifecycle
      // changes (source replacement, MediaSource attach, recovery). They must
      // update local UI only. Watch Party host commands are emitted from the
      // explicit user control path in togglePlayPause below.
      setPlayPending(true);
    };
    const handlePause = () => {
      logMediaEvent("pause", { force: true });
      const pendingCommand = pendingRemoteCommandRef.current;
      if (!pendingCommand || getRemotePlaybackStatus(pendingCommand) !== "PLAYING") {
        pendingRemoteCommandRef.current = null;
      }
      remoteStartupCommandRef.current = null;
      pause();
      flushProgress("pause");
    };
    const handleEnded = () => {
      logMediaEvent("ended", { force: true });
      if (endedCallbackFiredRef.current) return;
      endedCallbackFiredRef.current = true;
      flushProgress("ended");
      setEnded(true);
      onEnded?.();
    };
    const confirmPlaybackStarted = () => {
      const latestCommand = latestRemoteCommandRef.current;
      if (
        latestCommand &&
        getRemotePlaybackStatus(latestCommand) === "PAUSED" &&
        !video.paused
      ) {
        logMediaMutation("pause", "confirm-playback-paused-authority", {}, latestCommand);
        video.pause();
        return false;
      }

      const startupCommand = remoteStartupCommandRef.current;
      remoteStartupCommandRef.current = null;
      pendingRemoteCommandRef.current = null;
      if (
        startupCommand &&
        startupCommand.version === remoteCommandVersionRef.current &&
        startupCommand.sourceVersion === sourceVersionRef.current &&
        getRemotePlaybackStatus(startupCommand.command) === "PLAYING"
      ) {
        logWatchPartyDiagnostic("[WP PLAY RECOVERY]", {
          event: "CONFIRMED",
          ...getMediaDiagnosticFields(video, startupCommand.command),
          sequence: getRemoteSequence(startupCommand.command),
          sourceVersion: sourceVersionRef.current,
        });
        reconcilePlayingToRemoteTarget(startupCommand.command);
      }
      if (mediaRecoveryRef.current?.sourceVersion === sourceVersionRef.current) {
        logWatchPartyDiagnostic("[WP SYNC RECOVERY]", {
          event: "STALL_EXIT",
          ...getMediaDiagnosticFields(video),
          sequence: mediaRecoveryRef.current.sequence,
          sourceVersion: sourceVersionRef.current,
        });
        mediaRecoveryRef.current = null;
      }
      play();
      setBuffering(false);
      setError(null);
      setAutoplayBlocked(null);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        const currentVideo = videoRef.current;
        if (currentVideo && !currentVideo.paused && !currentVideo.ended && !usePlayerStore.getState().isSettingsOpen) {
          hideControls();
        }
      }, 3000);
      return true;
    };
    const handleTimeUpdate = () => {
      logMediaEvent("timeupdate");
      const pendingPlay = remoteStartupCommandRef.current;
      const advancedWhilePending =
        pendingPlay?.awaitingProgress &&
        pendingPlay.sourceVersion === sourceVersionRef.current &&
        !video.paused &&
        !video.seeking &&
        video.currentTime > pendingPlay.lastObservedTime + 0.01;
      const recoveredAfterStall =
        mediaRecoveryRef.current?.sourceVersion === sourceVersionRef.current &&
        !video.paused &&
        !video.seeking &&
        video.currentTime > mediaRecoveryRef.current.lastTime + 0.01;
      if (!video.paused && !video.ended && !isPlaying) {
        confirmPlaybackStarted();
      } else if (advancedWhilePending || recoveredAfterStall) {
        confirmPlaybackStarted();
      } else if (pendingPlay) {
        pendingPlay.lastObservedTime = video.currentTime;
      }
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
    const handleLoadedMetadata = () => {
      logMediaEvent("loadedmetadata", { force: true });
      setDuration(video.duration);
      setError(null);
      const pendingCommand = pendingRemoteCommandRef.current;
      if (pendingCommand) {
        const version = remoteCommandVersionRef.current;
        void applyRemotePlaybackCommand(pendingCommand, version);
      }
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBufferedTime(video.buffered.end(video.buffered.length - 1));
      }
    };
    const enterMediaRecovery = (eventName: "waiting" | "stalled") => {
      mediaRecoveryRef.current = {
        sourceVersion: sourceVersionRef.current,
        sequence: getRemoteSequence(latestRemoteCommandRef.current),
        enteredAt: getNowMs(),
        lastTime: video.currentTime,
      };
      logWatchPartyDiagnostic("[WP SYNC RECOVERY]", {
        event: "STALL_ENTER",
        mediaEvent: eventName,
        ...getMediaDiagnosticFields(video),
        sequence: getRemoteSequence(latestRemoteCommandRef.current),
        sourceVersion: sourceVersionRef.current,
      });
    };
    const handleWaiting = () => {
      logMediaEvent("waiting", { force: true });
      enterMediaRecovery("waiting");
      setBuffering(true);
    };
    const handleStalled = () => {
      logMediaEvent("stalled", { force: true });
      enterMediaRecovery("stalled");
    };
    const handleSeeking = () => {
      logMediaEvent("seeking", { force: true });
    };
    const handleSeeked = () => {
      logMediaEvent("seeked", { force: true });
    };
    const handleRateChange = () => {
      logMediaEvent("ratechange", { force: true });
    };
    const handleEmptied = () => {
      logMediaEvent("emptied", { force: true });
    };
    const handleCanPlay = () => {
      logMediaEvent("canplay", { force: true });
      setBuffering(false);
      setError(null);
    };
    const handleCanPlayThrough = () => {
      logMediaEvent("canplaythrough", { force: true });
    };
    const handlePlaying = () => {
      logMediaEvent("playing", { force: true });
      confirmPlaybackStarted();
    };
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
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleStalled);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("ratechange", handleRateChange);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("canplaythrough", handleCanPlayThrough);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("emptied", handleEmptied);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleStalled);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("ratechange", handleRateChange);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("emptied", handleEmptied);
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
    setAutoplayBlocked,
    setPlayPending,
    hideControls,
    isPlaying,
    logMediaEvent,
    logMediaMutation,
    onEnded,
    onError,
    onProgress,
    onTimeUpdate,
    applyRemotePlaybackCommand,
    reconcilePlayingToRemoteTarget,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !remoteCommand) return;

    const version = remoteCommandVersionRef.current + 1;
    remoteCommandVersionRef.current = version;
    latestRemoteCommandRef.current = remoteCommand;
    void applyRemotePlaybackCommand(remoteCommand, version);
  }, [applyRemotePlaybackCommand, remoteCommand]);

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

    const previousRate = video.playbackRate;
    video.playbackRate = playbackSpeed;
    logMediaMutation("playbackRate", "playback-speed-setting", {
      from: Number(previousRate.toFixed(3)),
      to: Number(playbackSpeed.toFixed(3)),
    });
  }, [logMediaMutation, playbackSpeed]);

  // Auto-hide controls
  useEffect(() => {
    if (!isControlsVisible) return;

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isSettingsOpen) {
        hideControls();
      }
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isControlsVisible, isPlaying, isSettingsOpen, hideControls]);

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

      clearSoftCorrection(video.playbackRate || playbackSpeed);
      const nextTime = getClampedPlaybackTime(video, time);
      logMediaMutation("currentTime", options?.silent ? "local-silent-seek" : "local-user-seek", {
        from: Number(video.currentTime.toFixed(3)),
        to: Number(nextTime.toFixed(3)),
      });
      video.currentTime = nextTime;
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
    [clearSoftCorrection, logMediaMutation, onPlaybackAction, playbackSpeed, setCurrentTime],
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
    const shouldReplay =
      nextType === "play" && shouldRestartEndedPlayback(video, video.currentTime);
    const currentTime = shouldReplay
      ? 0
      : Number.isFinite(video.currentTime)
        ? video.currentTime
        : 0;
    const playbackRate = video.playbackRate || 1;

      if (nextType === "play") {
      if (shouldReplay) {
        endedCallbackFiredRef.current = false;
        setEnded(false);
        logMediaMutation("currentTime", "local-ended-replay", {
          from: Number(video.currentTime.toFixed(3)),
          to: 0,
        });
        video.currentTime = 0;
        setCurrentTime(0);
      }
      setPlayPending(true);
      logMediaMutation("play", "local-toggle-play");
      video.play().catch((error: unknown) => {
        if (isAutoplayBlockedError(error)) {
          setAutoplayBlocked(AUTOPLAY_BLOCKED_MESSAGE);
        } else {
          setError("Ошибка воспроизведения");
        }
      });
    } else {
      pendingRemoteCommandRef.current = null;
      remoteStartupCommandRef.current = null;
      logMediaMutation("pause", "local-toggle-pause");
      video.pause();
    }

    if (!sourceTransitionRef.current && !suppressPlaybackActionRef.current) {
      onPlaybackAction?.({
        type: nextType,
        currentTime,
        playbackRate,
      });
    }
  }, [logMediaMutation, onPlaybackAction, setAutoplayBlocked, setCurrentTime, setEnded, setError, setPlayPending]);

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
    retryBlockedAutoplay,
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
