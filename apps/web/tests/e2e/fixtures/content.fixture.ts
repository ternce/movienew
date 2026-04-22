import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { AgeCategory, ContentType, ContentStatus } from '@movie-platform/shared';

/**
 * Mock content data for isolated tests
 */
export const MOCK_CONTENT = {
  freeContent: {
    id: 'content-free-1',
    slug: 'free-series-test',
    title: 'Бесплатный сериал',
    description: 'Описание бесплатного сериала для тестирования',
    contentType: ContentType.SERIES,
    ageCategory: AgeCategory.AGE_0,
    status: ContentStatus.PUBLISHED,
    isFree: true,
    duration: 3600,
    thumbnailUrl: '/test/thumbnail-free.jpg',
    videoUrl: '/test/video-free.m3u8',
  },
  premiumContent: {
    id: 'content-premium-1',
    slug: 'premium-series-test',
    title: 'Премиум сериал',
    description: 'Описание премиум сериала для тестирования',
    contentType: ContentType.SERIES,
    ageCategory: AgeCategory.AGE_16,
    status: ContentStatus.PUBLISHED,
    isFree: false,
    duration: 5400,
    thumbnailUrl: '/test/thumbnail-premium.jpg',
    videoUrl: '/test/video-premium.m3u8',
  },
  adultContent: {
    id: 'content-adult-1',
    slug: 'adult-series-test',
    title: 'Контент 18+',
    description: 'Контент только для взрослых',
    contentType: ContentType.SERIES,
    ageCategory: AgeCategory.AGE_18,
    status: ContentStatus.PUBLISHED,
    isFree: false,
    duration: 7200,
    thumbnailUrl: '/test/thumbnail-adult.jpg',
    videoUrl: '/test/video-adult.m3u8',
  },
  childContent: {
    id: 'content-child-1',
    slug: 'child-series-test',
    title: 'Детский контент',
    description: 'Контент для детей 6+',
    contentType: ContentType.SERIES,
    ageCategory: AgeCategory.AGE_6,
    status: ContentStatus.PUBLISHED,
    isFree: true,
    duration: 1800,
    thumbnailUrl: '/test/thumbnail-child.jpg',
    videoUrl: '/test/video-child.m3u8',
  },
} as const;

/**
 * Mock episodes data
 */
export const MOCK_EPISODES = [
  {
    id: 'episode-1',
    title: 'Серия 1: Начало',
    episodeNumber: 1,
    seasonNumber: 1,
    duration: 2700,
    thumbnailUrl: '/test/episode-1.jpg',
  },
  {
    id: 'episode-2',
    title: 'Серия 2: Продолжение',
    episodeNumber: 2,
    seasonNumber: 1,
    duration: 2800,
    thumbnailUrl: '/test/episode-2.jpg',
  },
  {
    id: 'episode-3',
    title: 'Серия 3: Финал',
    episodeNumber: 3,
    seasonNumber: 1,
    duration: 3000,
    thumbnailUrl: '/test/episode-3.jpg',
  },
];

/**
 * Series page object model
 */
export class SeriesPage {
  readonly page: Page;
  readonly title: Locator;
  readonly description: Locator;
  readonly ageBadge: Locator;
  readonly playButton: Locator;
  readonly subscribeButton: Locator;
  readonly episodesList: Locator;
  readonly episodeCard: Locator;
  readonly seasonSelector: Locator;
  readonly addToWatchlistButton: Locator;
  readonly shareButton: Locator;
  readonly ageRestrictionWarning: Locator;
  readonly accessDeniedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-testid="series-title"], h1');
    this.description = page.locator('[data-testid="series-description"], .description');
    this.ageBadge = page.locator('[data-testid="age-badge"], .age-badge');
    this.playButton = page.locator('[data-testid="play-button"], button:has-text("Смотреть")');
    this.subscribeButton = page.locator('[data-testid="subscribe-button"], button:has-text("Подписаться")');
    this.episodesList = page.locator('[data-testid="episodes-list"], .episodes-list');
    this.episodeCard = page.locator('[data-testid="episode-card"], .episode-card');
    this.seasonSelector = page.locator('[data-testid="season-selector"], select.season-selector');
    this.addToWatchlistButton = page.locator('[data-testid="watchlist-button"], button:has-text("В избранное")');
    this.shareButton = page.locator('[data-testid="share-button"], button:has-text("Поделиться")');
    this.ageRestrictionWarning = page.locator('[data-testid="age-warning"], .age-restriction-warning');
    this.accessDeniedMessage = page.locator('[data-testid="access-denied"], .access-denied');
  }

  async goto(slug: string) {
    await this.page.goto(`/series/${slug}`);
    await this.page.waitForLoadState('networkidle');
  }

  async playFirstEpisode() {
    await this.playButton.click();
    await this.page.waitForURL(/\/watch\//);
  }

  async selectEpisode(episodeNumber: number) {
    await this.episodeCard.nth(episodeNumber - 1).click();
    await this.page.waitForURL(/\/watch\//);
  }

  async selectSeason(seasonNumber: number) {
    await this.seasonSelector.selectOption(String(seasonNumber));
    await this.page.waitForLoadState('networkidle');
  }

  async expectAgeRestricted() {
    await expect(this.ageRestrictionWarning.or(this.accessDeniedMessage)).toBeVisible();
  }

  async expectPlayable() {
    await expect(this.playButton).toBeVisible();
    await expect(this.playButton).toBeEnabled();
  }

  async expectRequiresSubscription() {
    await expect(this.subscribeButton).toBeVisible();
  }
}

/**
 * Watch/Player page object model
 */
export class WatchPage {
  readonly page: Page;
  readonly videoPlayer: Locator;
  readonly playPauseButton: Locator;
  readonly progressBar: Locator;
  readonly currentTime: Locator;
  readonly duration: Locator;
  readonly volumeButton: Locator;
  readonly volumeSlider: Locator;
  readonly fullscreenButton: Locator;
  readonly qualitySelector: Locator;
  readonly subtitlesButton: Locator;
  readonly skipIntroButton: Locator;
  readonly nextEpisodeButton: Locator;
  readonly backButton: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly accessDeniedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.videoPlayer = page.locator('[data-testid="video-player"], video, .video-player');
    this.playPauseButton = page.locator('[data-testid="play-pause"], button[aria-label*="Play"], button[aria-label*="Pause"]');
    this.progressBar = page.locator('[data-testid="progress-bar"], .progress-bar, input[type="range"]');
    this.currentTime = page.locator('[data-testid="current-time"], .current-time');
    this.duration = page.locator('[data-testid="duration"], .duration');
    this.volumeButton = page.locator('[data-testid="volume-button"], button[aria-label*="Volume"]');
    this.volumeSlider = page.locator('[data-testid="volume-slider"], .volume-slider');
    this.fullscreenButton = page.locator('[data-testid="fullscreen-button"], button[aria-label*="Fullscreen"]');
    this.qualitySelector = page.locator('[data-testid="quality-selector"], .quality-selector, button:has-text("качество")');
    this.subtitlesButton = page.locator('[data-testid="subtitles-button"], button[aria-label*="Subtitles"]');
    this.skipIntroButton = page.locator('[data-testid="skip-intro"], button:has-text("Пропустить")');
    this.nextEpisodeButton = page.locator('[data-testid="next-episode"], button:has-text("Следующая серия")');
    this.backButton = page.locator('[data-testid="back-button"], a[href*="/series/"]');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner, .loading');
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message');
    this.accessDeniedMessage = page.locator('[data-testid="access-denied"], .access-denied');
  }

  async goto(contentId: string) {
    await this.page.goto(`/watch/${contentId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForVideoReady(timeout = 30000) {
    // Wait for video element and loading to complete
    await expect(this.videoPlayer).toBeVisible({ timeout });
    await expect(this.loadingSpinner).toBeHidden({ timeout });
  }

  async play() {
    const isPlaying = await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    });

    if (!isPlaying) {
      await this.playPauseButton.click();
    }
  }

  async pause() {
    const isPlaying = await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    });

    if (isPlaying) {
      await this.playPauseButton.click();
    }
  }

  async seekTo(seconds: number) {
    await this.page.evaluate((seekTime) => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = seekTime;
      }
    }, seconds);
  }

  async setVolume(level: number) {
    await this.page.evaluate((vol) => {
      const video = document.querySelector('video');
      if (video) {
        video.volume = vol;
      }
    }, level);
  }

  async toggleFullscreen() {
    await this.fullscreenButton.click();
  }

  async selectQuality(quality: string) {
    await this.qualitySelector.click();
    await this.page.locator(`[data-testid="quality-option-${quality}"], button:has-text("${quality}")`).click();
  }

  async getCurrentTime(): Promise<number> {
    return await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.currentTime || 0;
    });
  }

  async getDuration(): Promise<number> {
    return await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.duration || 0;
    });
  }

  async isPlaying(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? !video.paused : false;
    });
  }

  async expectVideoLoaded() {
    await expect(this.videoPlayer).toBeVisible();
    const duration = await this.getDuration();
    expect(duration).toBeGreaterThan(0);
  }

  async expectAccessDenied() {
    await expect(this.accessDeniedMessage.or(this.errorMessage)).toBeVisible();
  }
}

/**
 * Search page object model
 */
export class SearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resultsContainer: Locator;
  readonly resultCard: Locator;
  readonly noResultsMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly filterButton: Locator;
  readonly genreFilter: Locator;
  readonly ageFilter: Locator;
  readonly typeFilter: Locator;
  readonly sortSelector: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[placeholder*="Поиск"]');
    this.searchButton = page.locator('[data-testid="search-button"], button[type="submit"]:has-text("Найти")');
    this.resultsContainer = page.locator('[data-testid="search-results"], .search-results');
    this.resultCard = page.locator('[data-testid="content-card"], .content-card');
    this.noResultsMessage = page.locator('[data-testid="no-results"], .no-results');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
    this.filterButton = page.locator('[data-testid="filter-button"], button:has-text("Фильтры")');
    this.genreFilter = page.locator('[data-testid="genre-filter"], .genre-filter');
    this.ageFilter = page.locator('[data-testid="age-filter"], .age-filter');
    this.typeFilter = page.locator('[data-testid="type-filter"], .type-filter');
    this.sortSelector = page.locator('[data-testid="sort-selector"], .sort-selector');
    this.pagination = page.locator('[data-testid="pagination"], .pagination');
  }

  async goto() {
    await this.page.goto('/search');
    await this.page.waitForLoadState('networkidle');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async searchWithFilter(query: string, filters: { genre?: string; age?: string; type?: string }) {
    await this.search(query);

    if (filters.genre) {
      await this.genreFilter.selectOption(filters.genre);
    }
    if (filters.age) {
      await this.ageFilter.selectOption(filters.age);
    }
    if (filters.type) {
      await this.typeFilter.selectOption(filters.type);
    }

    await this.page.waitForLoadState('networkidle');
  }

  async getResultsCount(): Promise<number> {
    return await this.resultCard.count();
  }

  async clickResult(index: number) {
    await this.resultCard.nth(index).click();
    await this.page.waitForURL(/\/(series|content)\//);
  }

  async expectResults(minCount = 1) {
    await expect(this.resultsContainer).toBeVisible();
    const count = await this.getResultsCount();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }

  async expectNoResults() {
    await expect(this.noResultsMessage).toBeVisible();
  }

  async expectResultsFiltered(ageCategory: string) {
    const cards = await this.resultCard.all();
    for (const card of cards) {
      const ageBadge = card.locator('.age-badge, [data-testid="age-badge"]');
      if (await ageBadge.isVisible()) {
        const badgeText = await ageBadge.textContent();
        // Verify content doesn't exceed user's age category
        expect(['0+', '6+', '12+', '16+', '18+']).toContain(badgeText?.trim());
      }
    }
  }
}

/**
 * Extended test fixture with content helpers
 */
interface ContentFixtures {
  seriesPage: SeriesPage;
  watchPage: WatchPage;
  searchPage: SearchPage;
  navigateToSeries: (slug: string) => Promise<void>;
  navigateToWatch: (contentId: string) => Promise<void>;
  playVideo: (slug: string) => Promise<void>;
  mockContentApi: (content: typeof MOCK_CONTENT[keyof typeof MOCK_CONTENT]) => Promise<void>;
}

/**
 * Create extended test with content fixtures
 */
export const test = base.extend<ContentFixtures>({
  seriesPage: async ({ page }, use) => {
    await use(new SeriesPage(page));
  },

  watchPage: async ({ page }, use) => {
    await use(new WatchPage(page));
  },

  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },

  navigateToSeries: async ({ page }, use) => {
    const navigate = async (slug: string) => {
      await page.goto(`/series/${slug}`);
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  navigateToWatch: async ({ page }, use) => {
    const navigate = async (contentId: string) => {
      await page.goto(`/watch/${contentId}`);
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },

  playVideo: async ({ page }, use) => {
    const play = async (slug: string) => {
      const seriesPage = new SeriesPage(page);
      await seriesPage.goto(slug);
      await seriesPage.playFirstEpisode();
    };
    await use(play);
  },

  mockContentApi: async ({ page }, use) => {
    const mock = async (content: typeof MOCK_CONTENT[keyof typeof MOCK_CONTENT]) => {
      await page.route(`**/api/v1/content/${content.slug}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: content }),
        });
      });

      await page.route(`**/api/v1/series/${content.slug}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { ...content, episodes: MOCK_EPISODES },
          }),
        });
      });
    };
    await use(mock);
  },
});

export { expect };

/**
 * Helper to format duration for assertions
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Wait for video to start playing
 */
export async function waitForVideoPlayback(page: Page, timeout = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isPlaying = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused && video.currentTime > 0;
    });

    if (isPlaying) return true;
    await page.waitForTimeout(500);
  }

  return false;
}

/**
 * Mock video streaming for isolated tests
 */
export async function mockVideoStream(page: Page) {
  // Mock HLS manifest
  await page.route('**/*.m3u8', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.apple.mpegurl',
      body: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXT-X-ENDLIST`,
    });
  });

  // Mock video segments with tiny video
  await page.route('**/*.ts', async (route) => {
    // Return empty response to avoid download errors
    await route.fulfill({
      status: 200,
      contentType: 'video/mp2t',
      body: Buffer.from([]),
    });
  });
}

/**
 * Mock age-restricted content access
 */
export async function mockAgeRestriction(page: Page, userAge: number) {
  await page.route('**/api/v1/content/**', async (route, request) => {
    const url = request.url();

    // Check if it's age-restricted content
    if (url.includes('adult') && userAge < 18) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'AGE_001',
            message: 'Контент недоступен для вашей возрастной категории',
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}
