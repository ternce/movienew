'use client';

import * as React from 'react';
import { Gear, Check, CaretRight, CaretLeft } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import {
  usePlayerStore,
  PLAYBACK_SPEEDS,
  type VideoQuality,
  type PlaybackSpeed,
} from '@/stores/player.store';

interface PlayerSettingsMenuProps {
  onQualityChange: (quality: VideoQuality) => void;
  className?: string;
}

type MenuView = 'main' | 'quality' | 'speed';

const QUALITY_LABELS: Record<VideoQuality, string> = {
  auto: 'Авто',
  '240p': '240p',
  '480p': '480p',
  '720p': '720p HD',
  '1080p': '1080p Full HD',
  '4k': '4K Ultra HD',
};

const SPEED_LABELS: Record<PlaybackSpeed, string> = {
  0.25: '0.25x',
  0.5: '0.5x',
  0.75: '0.75x',
  1: 'Обычная',
  1.25: '1.25x',
  1.5: '1.5x',
  1.75: '1.75x',
  2: '2x',
};

/**
 * Settings menu for quality and playback speed
 */
export function PlayerSettingsMenu({ onQualityChange, className }: PlayerSettingsMenuProps) {
  const {
    quality,
    availableQualities,
    playbackSpeed,
    setPlaybackSpeed,
    isSettingsOpen,
    setSettingsOpen,
  } = usePlayerStore();

  const [menuView, setMenuView] = React.useState<MenuView>('main');
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
        setMenuView('main');
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isSettingsOpen, setSettingsOpen]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        if (menuView !== 'main') {
          setMenuView('main');
        } else {
          setSettingsOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, menuView, setSettingsOpen]);

  const handleQualitySelect = (q: VideoQuality) => {
    onQualityChange(q);
    setMenuView('main');
    setSettingsOpen(false);
  };

  const handleSpeedSelect = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    setMenuView('main');
    setSettingsOpen(false);
  };

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      {/* Settings button */}
      <button
        onClick={() => setSettingsOpen(!isSettingsOpen)}
        className={cn(
          'p-2 md:p-2.5 hover:bg-white/10 rounded-lg transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-mp-accent-primary',
          isSettingsOpen && 'bg-white/10'
        )}
        aria-label="Настройки"
        aria-expanded={isSettingsOpen}
      >
        <Gear className={cn('w-5 h-5 text-white transition-transform', isSettingsOpen && 'rotate-45')} />
      </button>

      {/* Menu dropdown */}
      {isSettingsOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-56 md:w-56 min-w-[256px] md:min-w-0 bg-mp-surface/95 backdrop-blur-sm border border-mp-border rounded-lg shadow-xl overflow-hidden">
          {/* Main menu */}
          {menuView === 'main' && (
            <div className="py-1">
              <MenuItem
                label="Качество"
                value={QUALITY_LABELS[quality]}
                onClick={() => setMenuView('quality')}
              />
              <MenuItem
                label="Скорость"
                value={playbackSpeed === 1 ? 'Обычная' : `${playbackSpeed}x`}
                onClick={() => setMenuView('speed')}
              />
            </div>
          )}

          {/* Quality submenu */}
          {menuView === 'quality' && (
            <div className="py-1">
              <SubMenuHeader title="Качество" onBack={() => setMenuView('main')} />
              <div className="max-h-48 overflow-y-auto">
                {availableQualities.map((q) => (
                  <SelectableItem
                    key={q}
                    label={QUALITY_LABELS[q]}
                    selected={quality === q}
                    onClick={() => handleQualitySelect(q)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Speed submenu */}
          {menuView === 'speed' && (
            <div className="py-1">
              <SubMenuHeader title="Скорость" onBack={() => setMenuView('main')} />
              <div className="max-h-48 overflow-y-auto">
                {PLAYBACK_SPEEDS.map(({ value }) => (
                  <SelectableItem
                    key={value}
                    label={SPEED_LABELS[value]}
                    selected={playbackSpeed === value}
                    onClick={() => handleSpeedSelect(value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Menu item with label and current value
function MenuItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-3 md:py-2 hover:bg-white/10 transition-colors"
    >
      <span className="text-sm text-white">{label}</span>
      <div className="flex items-center gap-1 text-mp-text-secondary">
        <span className="text-sm">{value}</span>
        <CaretRight className="w-4 h-4" />
      </div>
    </button>
  );
}

// Submenu header with back button
function SubMenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="w-full flex items-center gap-2 px-3 py-3 md:py-2 border-b border-mp-border hover:bg-white/10 transition-colors"
    >
      <CaretLeft className="w-4 h-4 text-mp-text-secondary" />
      <span className="text-sm font-medium text-white">{title}</span>
    </button>
  );
}

// Selectable item with checkmark
function SelectableItem({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3 py-3 md:py-2 hover:bg-white/10 transition-colors',
        selected && 'text-mp-accent-primary'
      )}
    >
      <span className="text-sm">{label}</span>
      {selected && <Check className="w-4 h-4" />}
    </button>
  );
}

/**
 * Compact settings toggle (for minimal controls)
 */
export function PlayerSettingsCompact({
  onQualityChange,
  className,
}: PlayerSettingsMenuProps) {
  const { quality, availableQualities } = usePlayerStore();

  // Cycle through qualities
  const cycleQuality = () => {
    const currentIndex = availableQualities.indexOf(quality);
    const nextIndex = (currentIndex + 1) % availableQualities.length;
    onQualityChange(availableQualities[nextIndex]);
  };

  return (
    <button
      onClick={cycleQuality}
      className={cn(
        'px-2 py-1 text-xs font-medium bg-black/40 hover:bg-black/60 rounded transition-colors',
        className
      )}
    >
      {quality === 'auto' ? 'АВТО' : quality.toUpperCase()}
    </button>
  );
}
