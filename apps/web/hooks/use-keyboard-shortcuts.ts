'use client';

import { useEffect, useCallback } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Allow when input is focused */
  allowInInput?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Shortcuts to register */
  shortcuts: KeyboardShortcut[];
}

/**
 * Register keyboard shortcuts
 * Automatically handles modifier keys and input focus
 */
export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check if focused on input
      const isInputFocused =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      for (const shortcut of shortcuts) {
        // Check if key matches
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatches) continue;

        // Check modifier keys
        const ctrlMatches = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatches = shortcut.alt ? e.altKey : !e.altKey;

        if (!ctrlMatches || !shiftMatches || !altMatches) continue;

        // Check if allowed in input
        if (isInputFocused && !shortcut.allowInInput) continue;

        // Prevent default if specified
        if (shortcut.preventDefault) {
          e.preventDefault();
        }

        // Execute handler
        shortcut.handler(e);
        break;
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common video player shortcuts
 */
export function useVideoPlayerShortcuts({
  enabled = true,
  onPlayPause,
  onSeekBack,
  onSeekForward,
  onVolumeUp,
  onVolumeDown,
  onMute,
  onFullscreen,
}: {
  enabled?: boolean;
  onPlayPause?: () => void;
  onSeekBack?: () => void;
  onSeekForward?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onFullscreen?: () => void;
}) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      // Space or K - Play/Pause
      {
        key: ' ',
        handler: () => onPlayPause?.(),
        preventDefault: true,
      },
      {
        key: 'k',
        handler: () => onPlayPause?.(),
        preventDefault: true,
      },
      // Left arrow or J - Seek back
      {
        key: 'ArrowLeft',
        handler: () => onSeekBack?.(),
        preventDefault: true,
      },
      {
        key: 'j',
        handler: () => onSeekBack?.(),
        preventDefault: true,
      },
      // Right arrow or L - Seek forward
      {
        key: 'ArrowRight',
        handler: () => onSeekForward?.(),
        preventDefault: true,
      },
      {
        key: 'l',
        handler: () => onSeekForward?.(),
        preventDefault: true,
      },
      // Up arrow - Volume up
      {
        key: 'ArrowUp',
        handler: () => onVolumeUp?.(),
        preventDefault: true,
      },
      // Down arrow - Volume down
      {
        key: 'ArrowDown',
        handler: () => onVolumeDown?.(),
        preventDefault: true,
      },
      // M - Mute toggle
      {
        key: 'm',
        handler: () => onMute?.(),
        preventDefault: true,
      },
      // F - Fullscreen toggle
      {
        key: 'f',
        handler: () => onFullscreen?.(),
        preventDefault: true,
      },
    ],
  });
}

/**
 * Global navigation shortcuts
 */
export function useNavigationShortcuts({
  enabled = true,
  onSearch,
  onHome,
  onProfile,
  onEscape,
}: {
  enabled?: boolean;
  onSearch?: () => void;
  onHome?: () => void;
  onProfile?: () => void;
  onEscape?: () => void;
}) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      // Ctrl/Cmd + K - Search
      {
        key: 'k',
        ctrl: true,
        handler: () => onSearch?.(),
        preventDefault: true,
      },
      // Escape - Close/cancel
      {
        key: 'Escape',
        handler: () => onEscape?.(),
        allowInInput: true,
      },
      // G then H - Go home (vim style)
      {
        key: 'h',
        handler: () => onHome?.(),
      },
      // G then P - Go to profile
      {
        key: 'p',
        handler: () => onProfile?.(),
      },
    ],
  });
}
