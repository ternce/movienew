'use client';

import * as React from 'react';
import { MagnifyingGlass, X, SpinnerGap, Clock, TrendUp } from '@phosphor-icons/react';
import { useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchSuggestions } from '@/hooks/use-search';

const RECENT_SEARCHES_KEY = 'mp-recent-searches';
const MAX_RECENT = 5;

interface SearchSuggestion {
  id: string;
  title: string;
  type?: string;
}

interface SearchInputProps {
  /** Placeholder text */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Show loading indicator */
  isLoading?: boolean;
  /** Value change callback */
  onValueChange?: (value: string) => void;
  /** Submit callback */
  onSubmit?: (value: string) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Get recent searches from localStorage
 */
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a search query to recent searches
 */
function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Highlight matching substring in text
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, matchIndex)}
      <span className="font-semibold text-mp-text-primary">
        {text.slice(matchIndex, matchIndex + query.length)}
      </span>
      {text.slice(matchIndex + query.length)}
    </>
  );
}

/**
 * Search input with debouncing, URL sync, and suggestions dropdown
 */
export function SearchInput({
  placeholder = 'Поиск...',
  autoFocus = false,
  isLoading = false,
  onValueChange,
  onSubmit,
  className,
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [value, setValue] = React.useState(initialQuery);
  const debouncedValue = useDebounce(value, 300);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [showDropdown, setShowDropdown] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  // Load recent searches on mount
  React.useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Sync debounced value
  React.useEffect(() => {
    onValueChange?.(debouncedValue);
  }, [debouncedValue, onValueChange]);

  // Fetch suggestions from API when debounced value changes
  const { data: apiSuggestions = [], isLoading: suggestionsLoading } =
    useSearchSuggestions(debouncedValue);

  React.useEffect(() => {
    setSuggestions(apiSuggestions);
    setSelectedIndex(-1);
  }, [apiSuggestions]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Items to display in dropdown
  const dropdownItems = React.useMemo(() => {
    if (suggestions.length > 0) return suggestions;
    if (!value.trim() && recentSearches.length > 0) {
      return recentSearches.map((s, i) => ({ id: `recent-${i}`, title: s, type: undefined }));
    }
    return [];
  }, [suggestions, recentSearches, value]);

  const isRecentMode = suggestions.length === 0 && !value.trim() && recentSearches.length > 0;

  // Navigate to search
  const navigateToSearch = (query: string) => {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    setRecentSearches(getRecentSearches());
    onSubmit?.(query.trim());
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setShowDropdown(false);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < dropdownItems.length) {
      const item = dropdownItems[selectedIndex];
      setValue(item.title);
      navigateToSearch(item.title);
    } else {
      navigateToSearch(value);
    }
  };

  // Clear input
  const handleClear = () => {
    setValue('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Handle keyboard in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || dropdownItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % dropdownItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + dropdownItems.length) % dropdownItems.length);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Global keyboard shortcut
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowDropdown(true);
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setShowDropdown(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const activeDescendant = selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {isLoading || suggestionsLoading ? (
            <SpinnerGap className="w-5 h-5 text-mp-text-disabled animate-spin" />
          ) : (
            <MagnifyingGlass className="w-5 h-5 text-mp-text-disabled" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showDropdown && dropdownItems.length > 0}
          aria-haspopup="listbox"
          aria-controls="search-suggestions"
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          className={cn(
            'w-full h-12 pl-12 pr-12 bg-mp-surface border border-mp-border rounded-xl',
            'text-mp-text-primary placeholder:text-mp-text-disabled',
            'focus:outline-none focus:ring-2 focus:ring-mp-accent-primary focus:border-transparent',
            'transition-all'
          )}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-mp-surface-2 rounded transition-colors z-10"
          >
            <X className="w-4 h-4 text-mp-text-secondary" />
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {!value && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-mp-text-disabled">
            <kbd className="px-1.5 py-0.5 bg-mp-surface-2 rounded border border-mp-border">&#8984;</kbd>
            <kbd className="px-1.5 py-0.5 bg-mp-surface-2 rounded border border-mp-border">K</kbd>
          </div>
        )}
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && dropdownItems.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-mp-surface border border-mp-border rounded-xl shadow-lg overflow-hidden z-50"
        >
          {/* Header */}
          {isRecentMode && (
            <div className="px-4 py-2 text-xs font-medium text-mp-text-disabled uppercase tracking-wider border-b border-mp-border">
              Недавние запросы
            </div>
          )}

          {dropdownItems.map((item, index) => (
            <button
              key={item.id}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              type="button"
              onClick={() => {
                setValue(item.title);
                navigateToSearch(item.title);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                index === selectedIndex
                  ? 'bg-mp-accent-primary/10'
                  : 'hover:bg-mp-surface-2'
              )}
            >
              {isRecentMode ? (
                <Clock className="w-4 h-4 text-mp-text-disabled shrink-0" />
              ) : (
                <TrendUp className="w-4 h-4 text-mp-text-disabled shrink-0" />
              )}
              <span className="flex-1 text-sm text-mp-text-secondary truncate">
                <HighlightMatch text={item.title} query={value} />
              </span>
              {item.type && (
                <span className="text-xs text-mp-text-disabled shrink-0">
                  {item.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact search input for header
 */
export function SearchInputCompact({
  placeholder = 'Поиск...',
  className,
}: Pick<SearchInputProps, 'placeholder' | 'className'>) {
  const router = useRouter();
  const [value, setValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      saveRecentSearch(value.trim());
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-text-disabled pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-9 pr-3 bg-mp-surface border border-mp-border rounded-lg',
          'text-sm text-mp-text-primary placeholder:text-mp-text-disabled',
          'focus:outline-none focus:ring-2 focus:ring-mp-accent-primary focus:border-transparent',
          'transition-all'
        )}
      />
    </form>
  );
}
