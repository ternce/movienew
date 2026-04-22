import { create } from 'zustand';

/**
 * Video quality options
 */
export type VideoQuality = 'auto' | '240p' | '480p' | '720p' | '1080p' | '4k';

/**
 * Playback speed options
 */
export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

/**
 * Player state interface
 */
interface PlayerState {
  // Current video
  currentVideoId: string | null;
  currentVideoUrl: string | null;
  currentVideoTitle: string | null;

  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  isEnded: boolean;
  isMuted: boolean;
  volume: number;

  // Progress
  currentTime: number;
  duration: number;
  bufferedTime: number;
  progress: number; // 0-100

  // Settings
  quality: VideoQuality;
  availableQualities: VideoQuality[];
  playbackSpeed: PlaybackSpeed;
  isFullscreen: boolean;
  isPictureInPicture: boolean;

  // UI state
  isControlsVisible: boolean;
  isSettingsOpen: boolean;
  lastActivityTime: number;

  // Error state
  error: string | null;

  // Actions - Video
  setVideo: (id: string, url: string, title: string) => void;
  clearVideo: () => void;

  // Actions - Playback
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;

  // Actions - Progress
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBufferedTime: (time: number) => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;

  // Actions - Settings
  setQuality: (quality: VideoQuality) => void;
  setAvailableQualities: (qualities: VideoQuality[]) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  setPictureInPicture: (pip: boolean) => void;
  togglePictureInPicture: () => void;

  // Actions - UI
  showControls: () => void;
  hideControls: () => void;
  setSettingsOpen: (open: boolean) => void;
  updateActivity: () => void;

  // Actions - State
  setBuffering: (buffering: boolean) => void;
  setEnded: (ended: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Initial player state
 */
const initialState = {
  currentVideoId: null,
  currentVideoUrl: null,
  currentVideoTitle: null,
  isPlaying: false,
  isPaused: true,
  isBuffering: false,
  isEnded: false,
  isMuted: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  bufferedTime: 0,
  progress: 0,
  quality: 'auto' as VideoQuality,
  availableQualities: ['auto', '720p', '1080p'] as VideoQuality[],
  playbackSpeed: 1 as PlaybackSpeed,
  isFullscreen: false,
  isPictureInPicture: false,
  isControlsVisible: true,
  isSettingsOpen: false,
  lastActivityTime: 0,
  error: null,
};

/**
 * Video player store
 */
export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  // Video actions
  setVideo: (id, url, title) =>
    set({
      currentVideoId: id,
      currentVideoUrl: url,
      currentVideoTitle: title,
      isPlaying: false,
      isPaused: true,
      isEnded: false,
      currentTime: 0,
      progress: 0,
      error: null,
    }),

  clearVideo: () =>
    set({
      currentVideoId: null,
      currentVideoUrl: null,
      currentVideoTitle: null,
      isPlaying: false,
      isPaused: true,
      currentTime: 0,
      duration: 0,
      progress: 0,
    }),

  // Playback actions
  play: () => set({ isPlaying: true, isPaused: false, isEnded: false }),
  pause: () => set({ isPlaying: false, isPaused: true }),
  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      set({ isPlaying: false, isPaused: true });
    } else {
      set({ isPlaying: true, isPaused: false, isEnded: false });
    }
  },

  setMuted: (muted) => set({ isMuted: muted }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), isMuted: volume === 0 }),

  // Progress actions
  setCurrentTime: (time) => {
    const { duration } = get();
    const progress = duration > 0 ? (time / duration) * 100 : 0;
    set({ currentTime: time, progress });
  },

  setDuration: (duration) => set({ duration }),
  setBufferedTime: (time) => set({ bufferedTime: time }),

  seek: (time) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(time, duration));
    const progress = duration > 0 ? (clampedTime / duration) * 100 : 0;
    set({ currentTime: clampedTime, progress });
  },

  seekRelative: (delta) => {
    const { currentTime, duration } = get();
    const newTime = Math.max(0, Math.min(currentTime + delta, duration));
    const progress = duration > 0 ? (newTime / duration) * 100 : 0;
    set({ currentTime: newTime, progress });
  },

  // Settings actions
  setQuality: (quality) => set({ quality }),
  setAvailableQualities: (qualities) => set({ availableQualities: qualities }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

  setPictureInPicture: (pip) => set({ isPictureInPicture: pip }),
  togglePictureInPicture: () => set((state) => ({ isPictureInPicture: !state.isPictureInPicture })),

  // UI actions
  showControls: () => set({ isControlsVisible: true, lastActivityTime: Date.now() }),
  hideControls: () => set({ isControlsVisible: false }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  updateActivity: () => set({ lastActivityTime: Date.now(), isControlsVisible: true }),

  // State actions
  setBuffering: (buffering) => set({ isBuffering: buffering }),
  setEnded: (ended) => set({ isEnded: ended, isPlaying: false, isPaused: true }),
  setError: (error) => set({ error, isPlaying: false, isPaused: true }),

  // Reset
  reset: () => set(initialState),
}));

/**
 * Selector hooks for common player state
 */
export const useCurrentVideo = () =>
  usePlayerStore((state) => ({
    id: state.currentVideoId,
    url: state.currentVideoUrl,
    title: state.currentVideoTitle,
  }));

export const usePlaybackState = () =>
  usePlayerStore((state) => ({
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    isBuffering: state.isBuffering,
    isEnded: state.isEnded,
  }));

export const useVideoProgress = () =>
  usePlayerStore((state) => ({
    currentTime: state.currentTime,
    duration: state.duration,
    progress: state.progress,
    bufferedTime: state.bufferedTime,
  }));

export const useVolumeState = () =>
  usePlayerStore((state) => ({
    volume: state.volume,
    isMuted: state.isMuted,
  }));

export const usePlayerSettings = () =>
  usePlayerStore((state) => ({
    quality: state.quality,
    availableQualities: state.availableQualities,
    playbackSpeed: state.playbackSpeed,
    isFullscreen: state.isFullscreen,
    isPictureInPicture: state.isPictureInPicture,
  }));

/**
 * Playback speed options for UI
 */
export const PLAYBACK_SPEEDS: { value: PlaybackSpeed; label: string }[] = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: 'Normal' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2, label: '2x' },
];
