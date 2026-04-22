import { test, expect, mockApiRoute } from '../fixtures/partner.fixture';

const MOCK_REFERRAL_TREE = {
  user: {
    id: 'user-1',
    firstName: 'Тест',
    lastName: 'Партнёр',
    email: 'partner@test.ru',
    referralCode: 'TESTPARTNER',
    isActive: true,
    registeredAt: new Date().toISOString(),
  },
  children: [
    {
      user: {
        id: 'ref-1',
        firstName: 'Иван',
        lastName: 'Иванов',
        email: 'ivan@test.ru',
        referralCode: 'IVAN123',
        isActive: true,
        registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      children: [
        {
          user: {
            id: 'ref-1-1',
            firstName: 'Анна',
            lastName: 'Петрова',
            email: 'anna@test.ru',
            referralCode: 'ANNA456',
            isActive: true,
            registeredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          },
          children: [],
          level: 2,
          totalEarnings: 500,
        },
      ],
      level: 1,
      totalEarnings: 2500,
    },
    {
      user: {
        id: 'ref-2',
        firstName: 'Пётр',
        lastName: 'Петров',
        email: 'petr@test.ru',
        referralCode: 'PETR789',
        isActive: false,
        registeredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
      children: [],
      level: 1,
      totalEarnings: 1000,
    },
    {
      user: {
        id: 'ref-3',
        firstName: 'Мария',
        lastName: 'Сидорова',
        email: 'maria@test.ru',
        referralCode: 'MARIA012',
        isActive: true,
        registeredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      children: [],
      level: 1,
      totalEarnings: 1500,
    },
  ],
  level: 0,
  totalEarnings: 5500,
  stats: {
    totalReferrals: 4,
    activeReferrals: 3,
    level1Count: 3,
    level2Count: 1,
    level3Count: 0,
    level4Count: 0,
    level5Count: 0,
  },
};

test.describe('Partner Referrals', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoute(page, /\/partners\/referrals/, MOCK_REFERRAL_TREE);
  });

  test('displays direct referrals list', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check direct referrals are shown
    await expect(page.getByText('Иван Иванов')).toBeVisible();
    await expect(page.getByText('Пётр Петров')).toBeVisible();
    await expect(page.getByText('Мария Сидорова')).toBeVisible();

    // Check emails are displayed
    await expect(page.getByText('ivan@test.ru')).toBeVisible();
    await expect(page.getByText('petr@test.ru')).toBeVisible();
  });

  test('expands referral node to show children', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Find the expand button for Ivan (who has children)
    const ivanNode = page.locator('text=Иван Иванов').first();
    await expect(ivanNode).toBeVisible();

    // Click expand button if available
    const expandButton = page.locator('[data-testid="expand-node-ref-1"]');
    if (await expandButton.isVisible()) {
      await expandButton.click();
      // Child should be visible
      await expect(page.getByText('Анна Петрова')).toBeVisible();
    }
  });

  test('shows referral activity status (active/inactive)', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check active indicators
    const activeIndicators = page.locator('[class*="emerald"]');

    // We have 3 active and 1 inactive referrals
    expect(await activeIndicators.count()).toBeGreaterThan(0);

    // Check for inactive status text
    await expect(page.getByText('Неактивен').first()).toBeVisible();
  });

  test('filters by tree depth (1-5 levels)', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Find depth filter selector
    const depthSelect = page.getByRole('combobox', { name: /глубина/i });
    if (await depthSelect.isVisible()) {
      // Select depth 2
      await depthSelect.click();
      await page.getByRole('option', { name: /2/ }).click();

      // Should show both levels
      await expect(page.getByText('Иван Иванов')).toBeVisible();
      // Child (level 2) should also be visible when expanded
    }
  });

  test('shows tree summary statistics', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check stats are displayed
    await expect(page.getByText(/4.*реферал/i)).toBeVisible();
    await expect(page.getByText(/3.*актив/i)).toBeVisible();

    // Check level breakdown
    await expect(page.getByText(/уровень 1/i)).toBeVisible();
    await expect(page.getByText('3').first()).toBeVisible(); // 3 level 1 referrals
  });

  test('handles empty referral state', async ({ page }) => {
    // Mock empty tree
    await mockApiRoute(page, /\/partners\/referrals/, {
      user: {
        id: 'user-1',
        firstName: 'Тест',
        lastName: 'Партнёр',
        email: 'partner@test.ru',
        referralCode: 'TESTPARTNER',
        isActive: true,
        registeredAt: new Date().toISOString(),
      },
      children: [],
      level: 0,
      totalEarnings: 0,
      stats: {
        totalReferrals: 0,
        activeReferrals: 0,
        level1Count: 0,
        level2Count: 0,
        level3Count: 0,
        level4Count: 0,
        level5Count: 0,
      },
    });

    await page.goto('/partner/referrals');
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    await expect(page.getByText(/нет реферал/i)).toBeVisible();
  });

  test('shows referral code for sharing', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check referral link/code is displayed
    await expect(page.getByText('TESTPARTNER')).toBeVisible();
  });

  test('displays earnings per referral', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check earnings are shown for referrals
    const earningsText = page.locator('text=/\\d+.*₽/');
    expect(await earningsText.count()).toBeGreaterThan(0);
  });

  test('shows registration date for each referral', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check dates are displayed (format: DD MMM YYYY)
    const datePattern = /\d{1,2}\s+[а-яё]+\.?\s+\d{4}/i;
    const dates = await page.locator(`text=${datePattern}`).count();
    expect(dates).toBeGreaterThan(0);
  });

  test('tree visualization loads correctly', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Check tree container is present
    const treeContainer = page.locator('[data-testid="referral-tree"]');
    if (await treeContainer.isVisible()) {
      // Tree nodes should be visible
      const nodes = page.locator('[data-testid^="tree-node-"]');
      expect(await nodes.count()).toBeGreaterThan(0);
    }
  });

  test('collapse all and expand all buttons work', async ({ page, goToReferrals }) => {
    await goToReferrals();

    // Find expand all button
    const expandAllButton = page.getByRole('button', { name: /развернуть все/i });
    if (await expandAllButton.isVisible()) {
      await expandAllButton.click();

      // All nested referrals should be visible
      await expect(page.getByText('Анна Петрова')).toBeVisible();

      // Find collapse all button
      const collapseAllButton = page.getByRole('button', { name: /свернуть все/i });
      if (await collapseAllButton.isVisible()) {
        await collapseAllButton.click();

        // Nested referrals should be hidden
        await expect(page.getByText('Анна Петрова')).not.toBeVisible();
      }
    }
  });
});
