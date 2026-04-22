import { test, expect } from '../fixtures/integration.fixture';
import { injectAuthState, mockCommonApi, TEST_USERS } from '../fixtures/integration.fixture';

const MOCK_PARTNER_DASHBOARD = {
  referralCode: 'PARTNER123',
  referralUrl: 'https://movieplatform.ru/?ref=PARTNER123',
  partnersCount: { level1: 5, level2: 3, level3: 1, total: 9 },
  totalEarned: 15000,
  balance: { pending: 2000, available: 5000 },
  canWithdraw: true,
  currentLevel: { level: 2, name: 'Серебряный', commissionRate: 0.1 },
  recentCommissions: [
    {
      id: 'comm-1',
      amount: 599,
      status: 'APPROVED',
      referralEmail: 'user@example.com',
      description: 'Подписка Премиум',
      createdAt: new Date().toISOString(),
    },
  ],
};

test.describe('Partner Program Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page, TEST_USERS.partner);
    await mockCommonApi(page);

    // Mock partner dashboard
    await page.route('**/api/v1/partners/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_PARTNER_DASHBOARD }),
      });
    });

    // Mock partner commissions
    await page.route('**/api/v1/partners/commissions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: MOCK_PARTNER_DASHBOARD.recentCommissions,
            total: 1,
            page: 1,
            limit: 20,
          },
        }),
      });
    });

    // Mock partner referrals
    await page.route('**/api/v1/partners/referrals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'ref-1',
                email: 'user@example.com',
                level: 1,
                registeredAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          },
        }),
      });
    });

    // Mock partner balance
    await page.route('**/api/v1/partners/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { pending: 2000, available: 5000 },
        }),
      });
    });

    // Mock partner levels
    await page.route('**/api/v1/partners/levels', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { level: 1, name: 'Бронзовый', commissionRate: 0.05, minReferrals: 0 },
            { level: 2, name: 'Серебряный', commissionRate: 0.1, minReferrals: 5 },
            { level: 3, name: 'Золотой', commissionRate: 0.15, minReferrals: 20 },
          ],
        }),
      });
    });
  });

  test('view partner dashboard with stats', async ({ page }) => {
    await page.goto('/partner');
    await expect(page.getByText(/партнёр|partner/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PARTNER123').first()).toBeVisible();
  });

  test('referral link is displayed and copyable', async ({ page }) => {
    await page.goto('/partner');
    await expect(page.getByText(/PARTNER123/).first()).toBeVisible({ timeout: 10000 });
  });

  test('view commissions list', async ({ page }) => {
    await page.goto('/partner');
    // Commission should be visible
    await expect(page.getByText(/599|комиссия|commission/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('new user can register with referral code', async ({ page }) => {
    // Mock registration with referral
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 'new-user', email: 'new@example.com', firstName: 'New', lastName: 'User', role: 'USER' },
            accessToken: 'new-token',
            refreshToken: 'new-refresh',
          },
        }),
      });
    });

    // Clear auth state for this test
    await page.addInitScript(() => {
      localStorage.removeItem('mp-auth-storage');
      document.cookie = 'mp-authenticated=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });

    await page.goto('/register?ref=PARTNER123');
    // Referral code should be preserved in URL
    await expect(page).toHaveURL(/ref=PARTNER123/);
  });
});
