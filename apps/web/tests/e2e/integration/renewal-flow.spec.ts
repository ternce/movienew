import { test, expect } from '../fixtures/integration.fixture';
import { injectAuthState, mockCommonApi, MOCK_PLANS, MOCK_ACTIVE_SUBSCRIPTION } from '../fixtures/integration.fixture';

test.describe('Subscription Renewal Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockCommonApi(page);

    // Mock sessions
    await page.route('**/api/v1/users/me/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Mock subscriptions
    await page.route('**/api/v1/subscriptions/my*', async (route) => {
      if (route.request().url().includes('/active')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_ACTIVE_SUBSCRIPTION }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [MOCK_ACTIVE_SUBSCRIPTION],
              total: 1,
              page: 1,
              limit: 20,
            },
          }),
        });
      }
    });

    // Mock plans
    await page.route('**/api/v1/subscriptions/plans*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_PLANS }),
      });
    });

    // Mock toggle auto-renew
    await page.route('**/api/v1/subscriptions/auto-renew', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_ACTIVE_SUBSCRIPTION, autoRenew: false },
        }),
      });
    });

    // Mock notifications
    await page.route('**/api/v1/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'notif-renewal',
              type: 'SUBSCRIPTION',
              title: 'Подписка скоро истекает',
              body: 'Ваша подписка "Премиум" истекает через 3 дня.',
              isRead: false,
              link: '/account/subscriptions',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          unreadCount: 1,
        }),
      });
    });

    await page.route('**/api/v1/notifications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
            unreadCount: 0,
          }),
        });
      } else {
        await route.fallback();
      }
    });
  });

  test('view active subscription with auto-renew on', async ({ page }) => {
    await page.goto('/account/subscriptions');
    await expect(page.getByText(/премиум|premium/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/активна|active/i).first()).toBeVisible();
  });

  test('subscription near expiry shows in account', async ({ page }) => {
    // Override with near-expiry subscription
    const nearExpiry = {
      ...MOCK_ACTIVE_SUBSCRIPTION,
      expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    };

    await page.route('**/api/v1/subscriptions/my*', async (route) => {
      if (route.request().url().includes('/active')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: nearExpiry }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [nearExpiry], total: 1, page: 1, limit: 20 },
          }),
        });
      }
    });

    await page.goto('/account/subscriptions');
    await expect(page.getByText(/премиум|premium/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('auto-renew status is displayed', async ({ page }) => {
    await page.goto('/account/subscriptions');
    // Auto-renew should be visible somewhere on the page
    await expect(page.getByText(/авто|продлен|renew/i).first()).toBeVisible({ timeout: 10000 });
  });
});
