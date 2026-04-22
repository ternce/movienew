import { test, expect, MOCK_PARTNER_DASHBOARD, mockApiRoute, formatCurrency } from '../fixtures/partner.fixture';

test.describe('Partner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the dashboard API
    await mockApiRoute(page, /\/partners\/dashboard/, MOCK_PARTNER_DASHBOARD);
    await mockApiRoute(page, /\/partners\/levels/, [
      { level: 'STARTER', minReferrals: 0, minEarnings: 0, rates: [0.1, 0.05, 0.03, 0.02, 0.01] },
      { level: 'BRONZE', minReferrals: 3, minEarnings: 10000, rates: [0.12, 0.06, 0.035, 0.025, 0.015] },
      { level: 'SILVER', minReferrals: 10, minEarnings: 50000, rates: [0.14, 0.07, 0.04, 0.03, 0.02] },
      { level: 'GOLD', minReferrals: 25, minEarnings: 150000, rates: [0.16, 0.08, 0.045, 0.035, 0.025] },
      { level: 'PLATINUM', minReferrals: 50, minEarnings: 500000, rates: [0.18, 0.09, 0.05, 0.04, 0.03] },
    ]);
  });

  test('displays partner statistics correctly', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    // Check stats cards are displayed
    await expect(page.getByText('Рефералы')).toBeVisible();
    await expect(page.getByText('5')).toBeVisible(); // total referrals
    await expect(page.getByText('3 акт.')).toBeVisible(); // active referrals

    // Check earnings
    await expect(page.getByText('Общий заработок')).toBeVisible();
    await expect(page.getByText(formatCurrency(15000))).toBeVisible();

    // Check pending
    await expect(page.getByText('Ожидает')).toBeVisible();
    await expect(page.getByText(formatCurrency(2500))).toBeVisible();
  });

  test('shows current level and progress to next level', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    // Check current level badge
    await expect(page.getByText('BRONZE').first()).toBeVisible();

    // Check progress to next level
    await expect(page.getByText('До уровня SILVER')).toBeVisible();

    // Check progress indicators
    await expect(page.getByText('3 / 10')).toBeVisible(); // referrals progress
    await expect(page.getByText(formatCurrency(15000))).toBeVisible();
    await expect(page.getByText(formatCurrency(50000))).toBeVisible();

    // Progress bars should be visible
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();
  });

  test('displays earnings breakdown (total, pending, available)', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    // Total earnings
    await expect(page.getByText('Общий заработок')).toBeVisible();

    // Pending earnings
    await expect(page.getByText('Ожидает')).toBeVisible();

    // Available balance (paid earnings)
    await expect(page.getByText('Доступно')).toBeVisible();
    await expect(page.getByText(formatCurrency(12500))).toBeVisible();
  });

  test('quick action buttons navigate correctly', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    // Check quick actions are visible
    const inviteButton = page.getByRole('link', { name: /пригласить/i });
    await expect(inviteButton).toBeVisible();

    // Click invite button
    await inviteButton.click();
    await expect(page).toHaveURL('/partner/invite');

    // Go back and test withdrawal button
    await page.goBack();
    const withdrawButton = page.getByRole('link', { name: /вывести/i });
    if (await withdrawButton.isVisible()) {
      await withdrawButton.click();
      await expect(page).toHaveURL('/partner/withdrawals/new');
    }
  });

  test('handles empty state for new partners', async ({ page }) => {
    // Mock empty dashboard
    await mockApiRoute(page, /\/partners\/dashboard/, {
      userId: 'new-user-id',
      level: 'STARTER',
      referralCode: 'NEWPARTNER',
      stats: {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
      },
      levelProgress: null,
    });

    await page.goto('/partner');
    await page.waitForLoadState('networkidle');

    // Check starter level is shown
    await expect(page.getByText('STARTER').first()).toBeVisible();

    // Check zero stats
    await expect(page.getByText('0').first()).toBeVisible();
  });

  test('shows loading skeleton while fetching', async ({ page }) => {
    // Delay the API response
    await page.route(/\/partners\/dashboard/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_PARTNER_DASHBOARD }),
      });
    });

    await page.goto('/partner');

    // Check skeleton loaders are visible
    const skeletons = page.locator('[class*="animate-pulse"]');
    const skeletonCount = await skeletons.count();
    expect(skeletonCount).toBeGreaterThan(0);

    // Wait for content to load
    await expect(page.getByText('BRONZE').first()).toBeVisible({ timeout: 5000 });
  });

  test('referral code is displayed with copy functionality', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    // Check referral code is visible
    await expect(page.getByText('TESTPARTNER')).toBeVisible();

    // Check copy button exists
    const copyButton = page.getByRole('button', { name: /копировать/i });
    if (await copyButton.isVisible()) {
      await copyButton.click();
      // Should show success feedback
      await expect(page.getByText(/скопирован/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('level rates are displayed in level card', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    // Check commission rates are shown
    await expect(page.getByText(/12%/)).toBeVisible();
    await expect(page.getByText(/6%/)).toBeVisible();
  });

  test('navigates to referrals from dashboard', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    const referralsLink = page.getByRole('link', { name: /рефералы/i });
    await expect(referralsLink).toBeVisible();
    await referralsLink.click();
    await expect(page).toHaveURL('/partner/referrals');
  });

  test('navigates to commissions from dashboard', async ({ page, goToPartnerDashboard }) => {
    await goToPartnerDashboard();

    const commissionsLink = page.getByRole('link', { name: /комиссии/i });
    await expect(commissionsLink).toBeVisible();
    await commissionsLink.click();
    await expect(page).toHaveURL('/partner/commissions');
  });
});
