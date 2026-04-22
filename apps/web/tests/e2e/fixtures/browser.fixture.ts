import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Browser detection helpers for cross-browser tests
 */
export function isMobile(page: Page): boolean {
  const viewport = page.viewportSize();
  return !!viewport && viewport.width < 768;
}

export function isWebKit(page: Page): boolean {
  return page.context().browser()?.browserType().name() === 'webkit';
}

export function isFirefox(page: Page): boolean {
  return page.context().browser()?.browserType().name() === 'firefox';
}

export function isChromium(page: Page): boolean {
  return page.context().browser()?.browserType().name() === 'chromium';
}

export function getBrowserName(page: Page): string {
  return page.context().browser()?.browserType().name() || 'unknown';
}

/**
 * Extended test fixture with browser helpers and API mocking
 */
interface BrowserFixtures {
  isMobile: boolean;
  isWebKit: boolean;
  isFirefox: boolean;
  isChromium: boolean;
  detectedBrowserName: string;
  skipOnMobile: () => void;
  skipOnDesktop: () => void;
  mockApi: (pattern: string, response: Record<string, unknown>, status?: number) => Promise<void>;
  mockContentList: () => Promise<void>;
  mockAuthenticatedUser: () => Promise<void>;
}

/**
 * Mock content data for browser tests
 */
const MOCK_CONTENT_LIST = {
  success: true,
  data: {
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `content-${i + 1}`,
      slug: `test-content-${i + 1}`,
      title: `Тестовый контент ${i + 1}`,
      description: `Описание контента ${i + 1}`,
      contentType: i % 2 === 0 ? 'SERIES' : 'CLIP',
      ageCategory: 'ZERO_PLUS',
      thumbnailUrl: `/images/placeholder-content.jpg`,
      duration: 3600,
      isFree: i < 3,
    })),
    meta: { page: 1, limit: 20, total: 6, totalPages: 1 },
  },
};

const MOCK_USER = {
  success: true,
  data: {
    id: 'user-test-1',
    email: 'test@example.com',
    firstName: 'Тест',
    lastName: 'Пользователь',
    role: 'BUYER',
    ageCategory: 'EIGHTEEN_PLUS',
    verificationStatus: 'UNVERIFIED',
    bonusBalance: 0,
    referralCode: 'TEST1234',
  },
};

/**
 * Create extended test with browser detection fixtures
 */
export const test = base.extend<BrowserFixtures>({
  isMobile: async ({ page }, use) => {
    await use(isMobile(page));
  },

  isWebKit: async ({ page }, use) => {
    await use(isWebKit(page));
  },

  isFirefox: async ({ page }, use) => {
    await use(isFirefox(page));
  },

  isChromium: async ({ page }, use) => {
    await use(isChromium(page));
  },

  detectedBrowserName: async ({ page }, use) => {
    await use(getBrowserName(page));
  },

  skipOnMobile: async ({ page }, use) => {
    const skip = () => {
      test.skip(isMobile(page), 'Test skipped on mobile viewport');
    };
    await use(skip);
  },

  skipOnDesktop: async ({ page }, use) => {
    const skip = () => {
      test.skip(!isMobile(page), 'Test skipped on desktop viewport');
    };
    await use(skip);
  },

  mockApi: async ({ page }, use) => {
    const mock = async (pattern: string, response: Record<string, unknown>, status = 200) => {
      await page.route(`**/api/v1/${pattern}`, async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });
    };
    await use(mock);
  },

  mockContentList: async ({ page }, use) => {
    const mock = async () => {
      await page.route('**/api/v1/content**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CONTENT_LIST),
        });
      });
      await page.route('**/api/v1/content/categories**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { categories: [] } }),
        });
      });
    };
    await use(mock);
  },

  mockAuthenticatedUser: async ({ page }, use) => {
    const mock = async () => {
      await page.route('**/api/v1/users/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER),
        });
      });
    };
    await use(mock);
  },
});

export { expect };
