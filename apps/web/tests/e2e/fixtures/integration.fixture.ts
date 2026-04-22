import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { TEST_USERS, mockAuthApi } from './auth.fixture';
import { mockAccountApi } from './account.fixture';

/**
 * Mock auth storage in localStorage for authenticated tests
 */
export async function injectAuthState(page: Page, user = TEST_USERS.user) {
  // Set cookies via browser context BEFORE page loads (server-side middleware needs these)
  await page.context().addCookies([
    { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
    { name: 'mp-auth-token', value: 'mock-access-token', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript((userData) => {
    localStorage.setItem('mp-auth-storage', JSON.stringify({
      state: {
        user: userData,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        isAuthenticated: true,
        isHydrated: true,
      },
      version: 0,
    }));
  }, user);
}

/**
 * Mock common API endpoints needed across integration tests
 */
export async function mockCommonApi(page: Page) {
  // Auth refresh
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { accessToken: 'new-mock-token', refreshToken: 'new-refresh-token' },
      }),
    });
  });

  // User profile
  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-1',
            email: TEST_USERS.user.email,
            firstName: 'Тест',
            lastName: 'Пользователь',
            role: 'USER',
            ageCategory: 'EIGHTEEN_PLUS',
            bonusBalance: 500,
            referralCode: 'TEST123',
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Unread notifications count
  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0 }),
    });
  });

  // Notification preferences
  await page.route('**/api/v1/notifications/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        emailMarketing: true,
        emailUpdates: true,
        pushNotifications: false,
      }),
    });
  });
}

/**
 * Mock subscription plans
 */
export const MOCK_PLANS = [
  {
    id: 'plan-premium',
    name: 'Премиум',
    description: 'Полный доступ ко всему контенту',
    type: 'PREMIUM',
    price: 599,
    currency: 'RUB',
    durationDays: 30,
    features: ['Все сериалы', 'Все клипы', 'HD качество', 'Без рекламы'],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'plan-basic',
    name: 'Базовый',
    description: 'Доступ к базовому контенту',
    type: 'BASIC',
    price: 299,
    currency: 'RUB',
    durationDays: 30,
    features: ['Базовые сериалы', 'SD качество'],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_ACTIVE_SUBSCRIPTION = {
  id: 'sub-1',
  planId: 'plan-premium',
  plan: MOCK_PLANS[0],
  status: 'ACTIVE',
  startDate: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  autoRenew: true,
  createdAt: new Date().toISOString(),
};

/**
 * Integration test fixture
 */
interface IntegrationFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<IntegrationFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await injectAuthState(page);
    await mockCommonApi(page);
    await use(page);
  },
});

export { expect, TEST_USERS, MOCK_PLANS };
