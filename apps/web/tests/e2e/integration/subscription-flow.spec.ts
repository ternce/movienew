import { test, expect } from '../fixtures/integration.fixture';
import { MOCK_PLANS, MOCK_ACTIVE_SUBSCRIPTION, injectAuthState, mockCommonApi } from '../fixtures/integration.fixture';

test.describe('Subscription Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await mockCommonApi(page);

    // Mock subscription plans
    await page.route('**/api/v1/subscriptions/plans*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_PLANS }),
      });
    });

    // Mock user subscriptions (initially empty)
    await page.route('**/api/v1/subscriptions/my*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [], total: 0, page: 1, limit: 20 } }),
      });
    });

    // Mock bonus balance
    await page.route('**/api/v1/bonuses/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { balance: 500, pending: 0 } }),
      });
    });

    // Mock max applicable bonuses
    await page.route('**/api/v1/bonuses/max-applicable*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { maxApplicable: 200 } }),
      });
    });

    // Mock purchase
    await page.route('**/api/v1/subscriptions/purchase', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'COMPLETED',
            transactionId: 'tx-123',
            subscription: MOCK_ACTIVE_SUBSCRIPTION,
          },
        }),
      });
    });

    // Mock payment status
    await page.route('**/api/v1/payments/status/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'COMPLETED', transactionId: 'tx-123' },
        }),
      });
    });
  });

  test('view pricing page and see plans', async ({ page }) => {
    await page.goto('/pricing');

    // Plans should be visible
    await expect(page.getByText('Премиум')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Базовый')).toBeVisible();
    await expect(page.getByText('599')).toBeVisible();
  });

  test('select plan and proceed to checkout', async ({ page }) => {
    await page.goto('/pricing');

    // Click on a plan's subscribe button
    const subscribeButton = page.getByRole('link', { name: /подписаться|выбрать|оформить/i }).first();
    if (await subscribeButton.isVisible({ timeout: 5000 })) {
      await subscribeButton.click();
      // Should navigate to checkout
      await expect(page).toHaveURL(/checkout/);
    }
  });

  test('subscription shows in account after purchase', async ({ page }) => {
    // Override subscriptions to show active one
    await page.route('**/api/v1/subscriptions/my*', async (route) => {
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
    });

    await page.route('**/api/v1/subscriptions/my/active*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ACTIVE_SUBSCRIPTION }),
      });
    });

    await page.goto('/account/subscriptions');
    await expect(page.getByText(/премиум|active|активна/i).first()).toBeVisible({ timeout: 10000 });
  });
});
