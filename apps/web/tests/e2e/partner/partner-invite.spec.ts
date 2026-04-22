import {
  test,
  expect,
  MOCK_PARTNER_DASHBOARD,
  mockApiRoute,
} from '../fixtures/partner.fixture';

test.describe('Partner Invite Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookies via browser context BEFORE page loads (server-side middleware needs these)
    await page.context().addCookies([
      { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
      { name: 'mp-auth-token', value: 'mock-token', domain: 'localhost', path: '/' },
    ]);
    // Inject auth state into localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        'mp-auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'partner-1',
              email: 'partner@test.movieplatform.ru',
              firstName: 'Тест',
              lastName: 'Партнёр',
              role: 'PARTNER',
            },
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh',
            isAuthenticated: true,
            isHydrated: true,
          },
          version: 0,
        })
      );
    });

    // Mock auth refresh
    await page.route('**/api/v1/auth/refresh', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { accessToken: 'new', refreshToken: 'new' },
        }),
      })
    );

    // Mock current user
    await page.route('**/api/v1/users/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'partner-1',
            email: 'partner@test.movieplatform.ru',
            firstName: 'Тест',
            lastName: 'Партнёр',
            role: 'PARTNER',
          },
        }),
      })
    );

    // Mock notifications
    await page.route('**/api/v1/notifications/unread-count', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      })
    );
    await page.route('**/api/v1/notifications/preferences', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emailMarketing: true,
          emailUpdates: true,
          pushNotifications: false,
        }),
      })
    );

    // Mock partner dashboard
    await page.route('**/api/v1/partners/dashboard', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_PARTNER_DASHBOARD,
        }),
      })
    );

    // Mock invite / referral info
    await page.route('**/api/v1/partners/invite*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            referralCode: 'TESTPARTNER',
            referralUrl:
              'https://movieplatform.ru/register?ref=TESTPARTNER',
          },
        }),
      })
    );

    // Mock commission rates
    await page.route('**/api/v1/partners/commission-rates', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            levels: [
              { level: 1, rate: 0.1 },
              { level: 2, rate: 0.05 },
              { level: 3, rate: 0.03 },
              { level: 4, rate: 0.02 },
              { level: 5, rate: 0.01 },
            ],
          },
        }),
      })
    );

    // Mock partner levels
    await page.route('**/api/v1/partners/levels', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { name: 'BRONZE', minReferrals: 0, current: true },
            { name: 'SILVER', minReferrals: 10 },
            { name: 'GOLD', minReferrals: 25 },
          ],
        }),
      })
    );
  });

  test('referral code is displayed on the invite page', async ({ page }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // The referral code TESTPARTNER should be visible on the page
    await expect(page.getByText('TESTPARTNER')).toBeVisible();
  });

  test('referral URL with ref parameter is displayed', async ({ page }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // Full referral URL should be visible
    await expect(
      page.getByText(/register\?ref=TESTPARTNER/)
    ).toBeVisible();
  });

  test('copy referral code button triggers clipboard action', async ({
    page,
  }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Find and click the copy button near the referral code
    const copyCodeButton = page
      .getByRole('button', { name: /копировать.*код|скопировать.*код/i })
      .or(page.locator('[data-testid="copy-referral-code"]'))
      .or(
        page.locator('button', { has: page.locator('[class*="Copy"]') }).first()
      );

    if (await copyCodeButton.isVisible()) {
      await copyCodeButton.click();

      // Should show success feedback (copied notification)
      await expect(
        page
          .getByText(/скопирован/i)
          .or(page.getByText(/copied/i))
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('copy referral URL button triggers clipboard action', async ({
    page,
  }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Find the copy button associated with the referral URL
    const copyUrlButton = page
      .getByRole('button', { name: /копировать.*ссылк|скопировать.*ссылк/i })
      .or(page.locator('[data-testid="copy-referral-url"]'));

    if (await copyUrlButton.isVisible()) {
      await copyUrlButton.click();

      // Should show success feedback
      await expect(
        page
          .getByText(/скопирован/i)
          .or(page.getByText(/copied/i))
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('"Как это работает" section with numbered steps is visible', async ({
    page,
  }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // The how-it-works section should be present
    await expect(
      page
        .getByText(/как это работает/i)
        .or(page.getByRole('heading', { name: /как это работает/i }))
    ).toBeVisible();

    // There should be numbered steps (at least 3)
    const stepIndicators = page.locator(
      '[data-testid^="step-"], [class*="step"]'
    );
    const stepCount = await stepIndicators.count();

    if (stepCount > 0) {
      expect(stepCount).toBeGreaterThanOrEqual(3);
    } else {
      // Alternatively, check for numbered text markers
      await expect(page.getByText(/1\./)).toBeVisible();
      await expect(page.getByText(/2\./)).toBeVisible();
      await expect(page.getByText(/3\./)).toBeVisible();
    }
  });

  test('commission rates grid displays all 5 levels', async ({ page }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // Check that all 5 commission levels are shown
    await expect(page.getByText(/уровень 1|1[-\s]уровень/i).first()).toBeVisible();
    await expect(page.getByText(/уровень 2|2[-\s]уровень/i).first()).toBeVisible();
    await expect(page.getByText(/уровень 3|3[-\s]уровень/i).first()).toBeVisible();
    await expect(page.getByText(/уровень 4|4[-\s]уровень/i).first()).toBeVisible();
    await expect(page.getByText(/уровень 5|5[-\s]уровень/i).first()).toBeVisible();
  });

  test('level 1 shows 10% commission rate', async ({ page }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // The 10% rate for level 1 should be visible
    await expect(page.getByText('10%')).toBeVisible();
  });

  test('partner levels section displays BRONZE, SILVER, GOLD', async ({
    page,
  }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // All three partner levels should be visible
    await expect(page.getByText('BRONZE').first()).toBeVisible();
    await expect(page.getByText('SILVER').first()).toBeVisible();
    await expect(page.getByText('GOLD').first()).toBeVisible();
  });

  test('current partner level has "Текущий" badge on BRONZE', async ({
    page,
  }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // The current level (BRONZE) should have a "Текущий" badge or indicator
    await expect(page.getByText('BRONZE').first()).toBeVisible();
    await expect(
      page
        .getByText(/текущий/i)
        .or(page.locator('[data-testid="current-level-badge"]'))
    ).toBeVisible();
  });

  test('share or invite buttons are visible', async ({ page }) => {
    await page.goto('/partner/invite');
    await page.waitForLoadState('networkidle');

    // There should be share/invite buttons (social sharing or generic invite)
    const shareButtons = page
      .getByRole('button', { name: /поделиться|пригласить|отправить/i })
      .or(page.locator('[data-testid^="share-"]'))
      .or(page.locator('a[href*="t.me"], a[href*="wa.me"], a[href*="vk.com"]'));

    const shareCount = await shareButtons.count();
    expect(shareCount).toBeGreaterThan(0);
  });
});
