'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { Container } from '@/components/ui/container';
import { Pagination } from '@/components/ui/pagination';
import {
  SearchInput,
  SearchFilters,
  SearchFilterChips,
  SearchResults,
  RecentSearches,
  type SearchFiltersState,
} from '@/components/search';
import { useSearchResults, type SearchResultItem } from '@/hooks/use-search';

const RECENT_SEARCHES_KEY = 'mp-recent-searches';

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
 * Save search to recent searches
 */
function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined') return;
  try {
    const searches = getRecentSearches();
    const filtered = searches.filter((s) => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, 10);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear recent searches
 */
function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Search page with filters and results
 */
export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';

  const [query, setQuery] = React.useState(queryFromUrl);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  const [filters, setFilters] = React.useState<SearchFiltersState>({
    type: 'all',
    category: 'all',
    age: 'all',
    year: 'all',
    sortBy: 'relevance',
  });

  // Fetch search results from API
  const { data: searchResponse, isLoading } = useSearchResults({
    query,
    type: filters.type,
    category: filters.category,
    age: filters.age,
    year: filters.year,
    sortBy: filters.sortBy,
    page: currentPage,
    limit: 20,
  });
  const results: SearchResultItem[] = searchResponse?.data?.items ?? [];
  const totalResults = searchResponse?.data?.total || results.length;

  // Load recent searches on mount
  React.useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Handle search submit
  const handleSearch = (value: string) => {
    if (value.trim()) {
      setQuery(value.trim());
      saveRecentSearch(value.trim());
      setRecentSearches(getRecentSearches());
    }
  };

  // Handle recent search selection
  const handleSelectRecent = (search: string) => {
    setQuery(search);
    router.push(`/search?q=${encodeURIComponent(search)}`);
  };

  // Handle clear recent searches
  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const totalPages = Math.ceil(totalResults / 20);

  return (
    <Container size="xl" className="py-6">
      {/* Search input */}
      <div className="mb-6">
        <SearchInput
          placeholder="Поиск сериалов, клипов, курсов..."
          autoFocus
          isLoading={isLoading}
          onValueChange={setQuery}
          onSubmit={handleSearch}
        />
      </div>

      {/* Filters */}
      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        className="mb-4"
      />

      {/* Active filter chips */}
      <SearchFilterChips
        filters={filters}
        onFiltersChange={setFilters}
        className="mb-6"
      />

      {/* Recent searches (show when no query) */}
      {!query && (
        <RecentSearches
          searches={recentSearches}
          onSelect={handleSelectRecent}
          onClear={handleClearRecent}
          className="mb-8"
        />
      )}

      {/* Results */}
      <SearchResults
        query={query}
        results={results}
        isLoading={isLoading}
        totalResults={totalResults}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </Container>
  );
}
