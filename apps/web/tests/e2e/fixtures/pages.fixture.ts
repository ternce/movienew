import { test as base, expect, type Page, type Locator } from '@playwright/test';

/**
 * Clips page POM
 */
export class ClipsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly itemCount: Locator;
  readonly sortSelect: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly filtersButton: Locator;
  readonly filterSidebar: Locator;
  readonly clearFiltersButton: Locator;
  readonly clipCards: Locator;
  readonly emptyState: Locator;
  readonly pagination: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.itemCount = page.locator('h1 + p, h1 ~ p');
    this.sortSelect = page.locator('[class*="SelectTrigger"]').first();
    this.gridViewButton = page.getByRole('button', { name: 'Grid view' });
    this.listViewButton = page.getByRole('button', { name: 'List view' });
    this.filtersButton = page.getByRole('button', { name: /Фильтры/i });
    this.filterSidebar = page.locator('aside');
    this.clearFiltersButton = page.getByRole('button', { name: /Сбросить фильтры/i });
    this.clipCards = page.locator('.content-card');
    this.emptyState = page.getByText('Ничего не найдено');
    this.pagination = page.locator('[class*="pagination"], nav[aria-label*="pagination"]');
    this.loadingSkeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
  }

  async goto() {
    await this.page.goto('/clips');
    await this.page.waitForLoadState('networkidle');
  }

  async toggleFilters() {
    await this.filtersButton.click();
  }

  async getClipCards() {
    return this.clipCards;
  }
}

/**
 * Tutorials listing page POM
 */
export class TutorialsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly itemCount: Locator;
  readonly sortSelect: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly filtersButton: Locator;
  readonly filterSidebar: Locator;
  readonly clearFiltersButton: Locator;
  readonly tutorialCards: Locator;
  readonly emptyState: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.itemCount = page.locator('h1 + p, h1 ~ p');
    this.sortSelect = page.locator('[class*="SelectTrigger"]').first();
    this.gridViewButton = page.getByRole('button', { name: 'Grid view' });
    this.listViewButton = page.getByRole('button', { name: 'List view' });
    this.filtersButton = page.getByRole('button', { name: /Фильтры/i });
    this.filterSidebar = page.locator('aside');
    this.clearFiltersButton = page.getByRole('button', { name: /Сбросить фильтры/i });
    this.tutorialCards = page.locator('.content-card');
    this.emptyState = page.getByText('Ничего не найдено');
    this.loadingSkeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
  }

  async goto() {
    await this.page.goto('/tutorials');
    await this.page.waitForLoadState('networkidle');
  }

  async toggleFilters() {
    await this.filtersButton.click();
  }
}

/**
 * Tutorial detail page POM
 */
export class TutorialDetailPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly ctaButton: Locator;
  readonly nextLessonInfo: Locator;
  readonly tabLessons: Locator;
  readonly tabAbout: Locator;
  readonly tabReviews: Locator;
  readonly lessonItems: Locator;
  readonly spinner: Locator;
  readonly emptyReviews: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1');
    this.heroDescription = page.locator('h1 ~ p').first();
    this.progressBar = page.locator('[class*="progress"], [role="progressbar"]');
    this.progressText = page.getByText(/из.*уроков/);
    this.ctaButton = page.getByRole('link', { name: /обучение/i });
    this.nextLessonInfo = page.getByText(/Следующий: Урок/);
    this.tabLessons = page.getByRole('button', { name: 'Уроки' });
    this.tabAbout = page.getByRole('button', { name: 'О курсе' });
    this.tabReviews = page.getByRole('button', { name: 'Отзывы' });
    this.lessonItems = page.locator('a[href^="/watch/"]');
    this.spinner = page.locator('[class*="spinner"], [class*="animate-spin"]');
    this.emptyReviews = page.getByText('Отзывы пока отсутствуют');
  }

  async goto(slug: string) {
    await this.page.goto(`/tutorials/${slug}`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectTab(tab: 'lessons' | 'about' | 'reviews') {
    const tabMap = {
      lessons: this.tabLessons,
      about: this.tabAbout,
      reviews: this.tabReviews,
    };
    await tabMap[tab].click();
  }
}

/**
 * Category page POM
 */
export class CategoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly itemCount: Locator;
  readonly tabAll: Locator;
  readonly tabSeries: Locator;
  readonly tabClips: Locator;
  readonly tabTutorials: Locator;
  readonly sectionHeadings: Locator;
  readonly contentCards: Locator;
  readonly emptyState: Locator;
  readonly loadingSkeleton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.itemCount = page.locator('h1 + p, h1 ~ p');
    this.tabAll = page.getByRole('button', { name: 'Все' });
    this.tabSeries = page.getByRole('button', { name: 'Сериалы' });
    this.tabClips = page.getByRole('button', { name: 'Клипы' });
    this.tabTutorials = page.getByRole('button', { name: 'Обучение' });
    this.sectionHeadings = page.locator('section h2');
    this.contentCards = page.locator('.content-card');
    this.emptyState = page.getByText('Контент не найден');
    this.loadingSkeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
    this.pagination = page.locator('[class*="pagination"], nav[aria-label*="pagination"]');
  }

  async goto(slug: string) {
    await this.page.goto(`/category/${slug}`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectTab(tab: 'all' | 'series' | 'clips' | 'tutorials') {
    const tabMap = {
      all: this.tabAll,
      series: this.tabSeries,
      clips: this.tabClips,
      tutorials: this.tabTutorials,
    };
    await tabMap[tab].click();
  }
}

/**
 * Shorts page POM
 */
export class ShortsPage {
  readonly page: Page;
  readonly scrollContainer: Locator;
  readonly shortCards: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly progressDots: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scrollContainer = page.locator('[class*="snap-y"]');
    this.shortCards = page.locator('[data-short-id]');
    this.prevButton = page.getByRole('button', { name: 'Предыдущее видео' });
    this.nextButton = page.getByRole('button', { name: 'Следующее видео' });
    this.progressDots = page.locator('button[aria-label^="Перейти к видео"]');
  }

  async goto() {
    await this.page.goto('/shorts');
    await this.page.waitForLoadState('networkidle');
  }

  async scrollToNext() {
    await this.nextButton.click();
  }

  async scrollToPrev() {
    await this.prevButton.click();
  }

  async getActiveShortIndex() {
    // The active dot has a different height (h-6 vs h-1.5)
    const dots = await this.progressDots.all();
    for (let i = 0; i < dots.length; i++) {
      const classes = await dots[i].getAttribute('class');
      if (classes?.includes('h-6')) return i;
    }
    return 0;
  }
}

/**
 * About page POM
 */
export class AboutPage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly featureCards: Locator;
  readonly missionSection: Locator;
  readonly contactEmail: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.locator('h1');
    this.featureCards = page.locator('section .grid > div');
    this.missionSection = page.getByText('Наша миссия');
    this.contactEmail = page.getByRole('link', { name: /support@movieplatform/i });
  }

  async goto() {
    await this.page.goto('/about');
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Document page POM
 */
export class DocumentPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly documentContent: Locator;
  readonly notFoundMessage: Locator;
  readonly spinner: Locator;
  readonly versionInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.documentContent = page.locator('.prose');
    this.notFoundMessage = page.getByText('Документ не найден');
    this.spinner = page.locator('[class*="spinner"], [class*="animate-spin"]');
    this.versionInfo = page.getByText(/Версия/);
  }

  async goto(type: string) {
    await this.page.goto(`/documents/${type}`);
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Extended test fixture with page helpers
 */
interface PagesFixtures {
  clipsPage: ClipsPage;
  tutorialsPage: TutorialsPage;
  tutorialDetailPage: TutorialDetailPage;
  categoryPage: CategoryPage;
  shortsPage: ShortsPage;
  aboutPage: AboutPage;
  documentPage: DocumentPage;
}

export const test = base.extend<PagesFixtures>({
  clipsPage: async ({ page }, use) => {
    await use(new ClipsPage(page));
  },
  tutorialsPage: async ({ page }, use) => {
    await use(new TutorialsPage(page));
  },
  tutorialDetailPage: async ({ page }, use) => {
    await use(new TutorialDetailPage(page));
  },
  categoryPage: async ({ page }, use) => {
    await use(new CategoryPage(page));
  },
  shortsPage: async ({ page }, use) => {
    await use(new ShortsPage(page));
  },
  aboutPage: async ({ page }, use) => {
    await use(new AboutPage(page));
  },
  documentPage: async ({ page }, use) => {
    await use(new DocumentPage(page));
  },
});

export { expect };
