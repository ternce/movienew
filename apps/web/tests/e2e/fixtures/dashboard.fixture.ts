import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { injectAuthState, mockCommonApi } from './integration.fixture';

// =============================================================================
// Mock Data
// =============================================================================

export const MOCK_FEATURED_CONTENT = {
  id: 'featured-1',
  slug: 'night-patrol-s2',
  title: 'Ночной патруль: Сезон 2',
  description: 'Продолжение захватывающего сериала о ночном городе. Новые герои, новые загадки.',
  contentType: 'SERIES',
  ageCategory: '16+',
  thumbnailUrl: '/images/featured-hero.jpg',
  bannerUrl: '/images/featured-banner.jpg',
  duration: 3600,
  isFree: false,
  rating: 4.8,
  episodeCount: 10,
};

export const MOCK_CONTINUE_WATCHING = [
  {
    id: 'cw-1',
    contentId: 'content-1',
    content: {
      id: 'content-1',
      title: 'Ночной патруль — Серия 5',
      slug: 'night-patrol',
      contentType: 'SERIES',
      thumbnailUrl: '/images/night-patrol-5.jpg',
      ageCategory: '16+',
      duration: 2700,
    },
    progress: 65,
    duration: 2700,
    remainingSeconds: 945,
    lastWatchedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cw-2',
    contentId: 'content-2',
    content: {
      id: 'content-2',
      title: 'Основы TypeScript — Урок 3',
      slug: 'typescript-basics',
      contentType: 'TUTORIAL',
      thumbnailUrl: '/images/ts-lesson-3.jpg',
      ageCategory: '0+',
      duration: 1800,
    },
    progress: 30,
    duration: 1800,
    remainingSeconds: 1260,
    lastWatchedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'cw-3',
    contentId: 'content-3',
    content: {
      id: 'content-3',
      title: 'Весёлые моменты #12',
      slug: 'funny-moments-12',
      contentType: 'CLIP',
      thumbnailUrl: '/images/funny-12.jpg',
      ageCategory: '0+',
      duration: 600,
    },
    progress: 80,
    duration: 600,
    remainingSeconds: 120,
    lastWatchedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const MOCK_POPULAR = [
  {
    id: 'pop-1',
    slug: 'city-lights',
    title: 'Огни большого города',
    contentType: 'SERIES',
    thumbnailUrl: '/images/city-lights.jpg',
    ageCategory: '12+',
    rating: 4.9,
    viewCount: 15200,
  },
  {
    id: 'pop-2',
    slug: 'cooking-master',
    title: 'Мастер-повар',
    contentType: 'SERIES',
    thumbnailUrl: '/images/cooking-master.jpg',
    ageCategory: '0+',
    rating: 4.7,
    viewCount: 12800,
  },
  {
    id: 'pop-3',
    slug: 'detective-stories',
    title: 'Детективные истории',
    contentType: 'SERIES',
    thumbnailUrl: '/images/detective.jpg',
    ageCategory: '16+',
    rating: 4.6,
    viewCount: 11500,
  },
  {
    id: 'pop-4',
    slug: 'music-clips-top',
    title: 'Лучшие музыкальные клипы',
    contentType: 'CLIP',
    thumbnailUrl: '/images/music-clips.jpg',
    ageCategory: '0+',
    rating: 4.5,
    viewCount: 10300,
  },
  {
    id: 'pop-5',
    slug: 'web-dev-course',
    title: 'Веб-разработка с нуля',
    contentType: 'TUTORIAL',
    thumbnailUrl: '/images/web-dev.jpg',
    ageCategory: '0+',
    rating: 4.8,
    viewCount: 9800,
  },
  {
    id: 'pop-6',
    slug: 'night-stories',
    title: 'Ночные рассказы',
    contentType: 'SERIES',
    thumbnailUrl: '/images/night-stories.jpg',
    ageCategory: '18+',
    rating: 4.4,
    viewCount: 8700,
  },
];

export const MOCK_NEW_RELEASES = [
  {
    id: 'new-1',
    slug: 'fresh-series',
    title: 'Новый сериал 2025',
    contentType: 'SERIES',
    thumbnailUrl: '/images/fresh.jpg',
    ageCategory: '12+',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'new-2',
    slug: 'fresh-tutorial',
    title: 'React 19: Полный курс',
    contentType: 'TUTORIAL',
    thumbnailUrl: '/images/react19.jpg',
    ageCategory: '0+',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// =============================================================================
// Page Object Model
// =============================================================================

export class DashboardPage {
  readonly page: Page;
  readonly heroSection: Locator;
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly heroCta: Locator;
  readonly continueWatchingSection: Locator;
  readonly continueWatchingCards: Locator;
  readonly progressIndicator: Locator;
  readonly remainingTime: Locator;
  readonly popularSection: Locator;
  readonly popularCards: Locator;
  readonly ratingBadge: Locator;
  readonly newReleasesSection: Locator;
  readonly seeAllLinks: Locator;
  readonly carousels: Locator;
  readonly emptyState: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroSection = page.locator('section').first();
    this.heroTitle = page.locator('h1, h2').first();
    this.heroDescription = page.locator('[data-testid="hero-description"]');
    this.heroCta = page.locator('[data-testid="hero-cta"], .hero-cta');
    this.continueWatchingSection = page.locator('section:has-text("Продолжить просмотр")');
    this.continueWatchingCards = page.locator('a[href^="/watch/"]');
    this.progressIndicator = page.locator('[role="progressbar"]');
    this.remainingTime = page.locator('text=/осталось \\d+ (мин|ч)/');
    this.popularSection = page.locator('section:has-text("Популярное")');
    this.popularCards = page.locator('a[href^="/content/"]');
    this.ratingBadge = page.locator('.backdrop-blur-md');
    this.newReleasesSection = page.locator('section:has-text("Новинки")');
    this.seeAllLinks = page.getByRole('link', { name: /Смотреть все/i });
    this.carousels = page.locator('.scroll-container');
    this.emptyState = page.locator('[data-testid="empty-state"]');
    this.loadingSkeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }
}

// =============================================================================
// Mock API
// =============================================================================

export async function mockDashboardApi(page: Page) {
  // Featured content
  await page.route('**/api/v1/content/featured*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_FEATURED_CONTENT }),
    });
  });

  await page.route('**/api/v1/content?*featured*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: [MOCK_FEATURED_CONTENT], total: 1 },
      }),
    });
  });

  // Continue watching
  await page.route('**/api/v1/watch-history/continue*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_CONTINUE_WATCHING, total: MOCK_CONTINUE_WATCHING.length },
      }),
    });
  });

  await page.route('**/api/v1/users/me/watch-history/continue*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_CONTINUE_WATCHING, total: MOCK_CONTINUE_WATCHING.length },
      }),
    });
  });

  // Popular content
  await page.route('**/api/v1/content?*sort=popular*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_POPULAR, total: MOCK_POPULAR.length },
      }),
    });
  });

  await page.route('**/api/v1/content/popular*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_POPULAR, total: MOCK_POPULAR.length },
      }),
    });
  });

  // New releases
  await page.route('**/api/v1/content/new*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_NEW_RELEASES, total: MOCK_NEW_RELEASES.length },
      }),
    });
  });

  // Generic content listing (fallback)
  await page.route('**/api/v1/content?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_POPULAR, total: MOCK_POPULAR.length, page: 1, limit: 20 },
      }),
    });
  });

  // Watch history
  await page.route('**/api/v1/watch-history?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_CONTINUE_WATCHING, total: MOCK_CONTINUE_WATCHING.length },
      }),
    });
  });

  // Subscription (for dashboard display)
  await page.route('**/api/v1/subscriptions/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'sub-1',
          plan: { name: 'Премиум', price: 599 },
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          autoRenew: true,
        },
      }),
    });
  });
}

// =============================================================================
// Test Fixture
// =============================================================================

interface DashboardFixtures {
  mockDashboardApis: void;
  dashboardPage: DashboardPage;
}

export const test = base.extend<DashboardFixtures>({
  mockDashboardApis: [
    async ({ page }, use) => {
      await injectAuthState(page);
      await mockCommonApi(page);
      await mockDashboardApi(page);
      await use();
    },
    { auto: true },
  ],
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };
