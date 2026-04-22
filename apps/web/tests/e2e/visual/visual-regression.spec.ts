import { test, expect, type Page } from '@playwright/test';

/**
 * Visual Regression E2E Tests
 *
 * Screenshot-based visual regression tests for all critical pages.
 * Compares current renders against baseline screenshots to detect
 * unintended visual changes across the platform.
 *
 * 20 tests covering:
 * - Public pages (landing, login, register, pricing, 404)
 * - Authenticated user pages (dashboard, account, bonuses, partner, store)
 * - Content pages (series detail, search results)
 * - Admin pages (admin dashboard)
 * - Mobile viewports (landing, navigation)
 * - Dark mode consistency
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function injectAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('mp-auth-storage', JSON.stringify({
      state: {
        user: { id: 'user-1', email: 'user@test.movieplatform.ru', firstName: 'Тест', lastName: 'Пользователь', role: 'USER' },
        accessToken: 'mock-token', refreshToken: 'mock-refresh',
        isAuthenticated: true, isHydrated: true,
      },
      version: 0,
    }));
    document.cookie = 'mp-authenticated=true;path=/';
  });
}

async function injectAdminAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('mp-auth-storage', JSON.stringify({
      state: {
        user: { id: 'admin-1', email: 'admin@test.movieplatform.ru', firstName: 'Тест', lastName: 'Админ', role: 'ADMIN' },
        accessToken: 'mock-admin-token', refreshToken: 'mock-admin-refresh',
        isAuthenticated: true, isHydrated: true,
      },
      version: 0,
    }));
    document.cookie = 'mp-authenticated=true;path=/';
  });
}

async function mockCommonApis(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { accessToken: 'new', refreshToken: 'new' } }) });
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'user-1', email: 'user@test.movieplatform.ru', firstName: 'Тест', lastName: 'Пользователь', role: 'USER', bonusBalance: 500 } }) });
  });

  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
  });

  await page.route('**/api/v1/notifications/preferences', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailMarketing: true, emailUpdates: true, pushNotifications: false }) });
  });

  await page.route('**/api/v1/content**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], total: 0 } }) });
  });

  await page.route('**/api/v1/subscription-plans**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.route('**/api/v1/store/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], total: 0 } }) });
  });

  await page.route('**/api/v1/bonuses/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { balance: 500 } }) });
  });

  await page.route('**/api/v1/partners/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  });

  await page.route('**/api/v1/watch-history/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [] } }) });
  });

  await page.route('**/api/v1/subscriptions/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
  });
}

async function mockAdminApis(page: Page) {
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { accessToken: 'new-admin', refreshToken: 'new-admin' } }) });
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'admin-1', email: 'admin@test.movieplatform.ru', firstName: 'Тест', lastName: 'Админ', role: 'ADMIN', bonusBalance: 0 } }) });
  });

  await page.route('**/api/v1/admin/dashboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          stats: { totalUsers: 1250, newUsersToday: 15, activeSubscriptions: 850, monthlyRevenue: 125000, pendingOrders: 8, pendingVerifications: 12, pendingWithdrawals: 5, contentCount: 320, productCount: 45 },
          revenueByMonth: [{ period: '2025-06', subscriptionRevenue: 45000, storeRevenue: 18000, totalRevenue: 63000 }],
          userGrowth: [{ date: '2025-07-01', newUsers: 15, totalUsers: 1200 }],
          recentTransactions: [],
        },
      }),
    });
  });

  await page.route('**/api/v1/admin/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { totalUsers: 1250, newUsersToday: 15, activeSubscriptions: 850, monthlyRevenue: 125000, pendingOrders: 8, pendingVerifications: 12, pendingWithdrawals: 5, contentCount: 320, productCount: 45 },
      }),
    });
  });

  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
  });
}

/** Screenshot comparison options used across all visual tests */
const SCREENSHOT_OPTIONS = {
  threshold: 0.1,
  maxDiffPixelRatio: 0.05,
  fullPage: false,
} as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Visual Regression', () => {
  // 1. Landing page hero
  test('landing page hero', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('landing-page-hero.png', SCREENSHOT_OPTIONS);
  });

  // 2. Login page
  test('login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', SCREENSHOT_OPTIONS);
  });

  // 3. Registration page
  test('registration page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('registration-page.png', SCREENSHOT_OPTIONS);
  });

  // 4. Dashboard (authenticated)
  test('dashboard page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-page.png', SCREENSHOT_OPTIONS);
  });

  // 5. Pricing page
  test('pricing page', async ({ page }) => {
    await page.route('**/api/v1/subscription-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'plan-basic', name: 'Базовый', price: 299, interval: 'MONTHLY', features: ['HD качество', '1 устройство'] },
            { id: 'plan-standard', name: 'Стандарт', price: 599, interval: 'MONTHLY', features: ['Full HD', '3 устройства', 'Без рекламы'] },
            { id: 'plan-premium', name: 'Премиум', price: 999, interval: 'MONTHLY', features: ['4K + HDR', '5 устройств', 'Без рекламы', 'Ранний доступ'] },
          ],
        }),
      });
    });

    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('pricing-page.png', SCREENSHOT_OPTIONS);
  });

  // 6. Checkout page (authenticated)
  test('checkout page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/subscription-plans/plan-premium', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'plan-premium', name: 'Премиум', price: 999, interval: 'MONTHLY', features: ['4K + HDR', '5 устройств'] },
        }),
      });
    });

    await page.goto('/subscribe/plan-premium');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('checkout-page.png', SCREENSHOT_OPTIONS);
  });

  // 7. Account settings (authenticated)
  test('account settings page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.goto('/account/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('account-settings-page.png', SCREENSHOT_OPTIONS);
  });

  // 8. Bonus dashboard (authenticated)
  test('bonus dashboard page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/bonuses**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { balance: 500, history: [], totalEarned: 1200, totalSpent: 700 },
        }),
      });
    });

    await page.goto('/bonuses');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('bonus-dashboard-page.png', SCREENSHOT_OPTIONS);
  });

  // 9. Partner dashboard (authenticated)
  test('partner dashboard page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/partners**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            referralCode: 'TEST1234',
            totalReferrals: 12,
            activeReferrals: 8,
            totalCommissions: 15000,
            pendingCommissions: 3500,
            level: 2,
          },
        }),
      });
    });

    await page.goto('/partner');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('partner-dashboard-page.png', SCREENSHOT_OPTIONS);
  });

  // 10. Store listing (authenticated)
  test('store listing page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/store/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 'prod-1', slug: 'futbolka-movieplatform', name: 'Футболка MoviePlatform', price: 2500, imageUrl: '/images/placeholder-content.jpg', category: 'Одежда' },
              { id: 'prod-2', slug: 'kruzhka-movieplatform', name: 'Кружка MoviePlatform', price: 990, imageUrl: '/images/placeholder-content.jpg', category: 'Аксессуары' },
            ],
            total: 2,
          },
        }),
      });
    });

    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('store-listing-page.png', SCREENSHOT_OPTIONS);
  });

  // 11. Product detail (authenticated)
  test('product detail page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/store/products/futbolka-movieplatform', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'prod-1',
            slug: 'futbolka-movieplatform',
            name: 'Футболка MoviePlatform',
            description: 'Стильная футболка с логотипом MoviePlatform',
            price: 2500,
            images: ['/images/placeholder-content.jpg'],
            category: 'Одежда',
            inStock: true,
            sizes: ['S', 'M', 'L', 'XL'],
          },
        }),
      });
    });

    await page.goto('/store/futbolka-movieplatform');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('product-detail-page.png', SCREENSHOT_OPTIONS);
  });

  // 12. Cart page (authenticated)
  test('cart page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/store/cart**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 'cart-item-1', productId: 'prod-1', name: 'Футболка MoviePlatform', price: 2500, quantity: 1, imageUrl: '/images/placeholder-content.jpg' },
            ],
            total: 2500,
          },
        }),
      });
    });

    await page.goto('/store/cart');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('cart-page.png', SCREENSHOT_OPTIONS);
  });

  // 13. Series detail (authenticated)
  test('series detail page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/content/test-series', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'content-1',
            slug: 'test-series',
            title: 'Тестовый сериал',
            description: 'Описание тестового сериала для визуального тестирования',
            contentType: 'SERIES',
            ageCategory: '16+',
            thumbnailUrl: '/images/placeholder-content.jpg',
            isFree: false,
            episodes: [
              { id: 'ep-1', title: 'Эпизод 1', duration: 2400, seasonNumber: 1, episodeNumber: 1 },
              { id: 'ep-2', title: 'Эпизод 2', duration: 2700, seasonNumber: 1, episodeNumber: 2 },
            ],
          },
        }),
      });
    });

    await page.goto('/series/test-series');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('series-detail-page.png', SCREENSHOT_OPTIONS);
  });

  // 14. Search results (authenticated)
  test('search results page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/content**', async (route) => {
      const url = route.request().url();
      if (url.includes('q=') || url.includes('search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                { id: 'sr-1', slug: 'result-1', title: 'Тестовый результат 1', contentType: 'SERIES', ageCategory: '12+', thumbnailUrl: '/images/placeholder-content.jpg' },
                { id: 'sr-2', slug: 'result-2', title: 'Тестовый результат 2', contentType: 'CLIP', ageCategory: '0+', thumbnailUrl: '/images/placeholder-content.jpg' },
              ],
              total: 2,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [], total: 0 } }),
        });
      }
    });

    await page.goto('/search?q=%D1%82%D0%B5%D1%81%D1%82');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('search-results-page.png', SCREENSHOT_OPTIONS);
  });

  // 15. Notifications page (authenticated)
  test('notifications page', async ({ page }) => {
    await injectAuth(page);
    await mockCommonApis(page);

    await page.route('**/api/v1/notifications**', async (route) => {
      const url = route.request().url();
      if (url.includes('unread-count')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 3 }) });
      } else if (url.includes('preferences')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailMarketing: true, emailUpdates: true, pushNotifications: false }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                { id: 'n-1', type: 'SYSTEM', title: 'Добро пожаловать!', message: 'Рады видеть вас на платформе', read: false, createdAt: new Date().toISOString() },
                { id: 'n-2', type: 'SUBSCRIPTION', title: 'Подписка активирована', message: 'Ваша подписка Премиум успешно активирована', read: true, createdAt: new Date().toISOString() },
              ],
              total: 2,
            },
          }),
        });
      }
    });

    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('notifications-page.png', SCREENSHOT_OPTIONS);
  });

  // 16. Admin dashboard
  test('admin dashboard page', async ({ page }) => {
    await injectAdminAuth(page);
    await mockAdminApis(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('admin-dashboard-page.png', SCREENSHOT_OPTIONS);
  });

  // 17. 404 page
  test('404 not found page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('404-page.png', SCREENSHOT_OPTIONS);
  });

  // 18. Mobile landing
  test('mobile landing page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-landing-page.png', SCREENSHOT_OPTIONS);
  });

  // 19. Mobile navigation (authenticated)
  test('mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await injectAuth(page);
    await mockCommonApis(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-navigation-page.png', SCREENSHOT_OPTIONS);
  });

  // 20. Dark mode consistency
  test('dark mode consistency', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the platform defaults to dark mode
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return computed.backgroundColor;
    });

    // Parse RGB values from computed background color
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      // Dark background: all RGB channels should be low (< 40 for our #05060A palette)
      expect(r).toBeLessThan(40);
      expect(g).toBeLessThan(40);
      expect(b).toBeLessThan(40);
    } else {
      // If not a simple RGB, check for dark class on html element
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(hasDarkClass).toBeTruthy();
    }

    await expect(page).toHaveScreenshot('dark-mode-landing.png', SCREENSHOT_OPTIONS);
  });
});
