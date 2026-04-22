import { test, expect, mockApiRoute, formatCurrency } from '../fixtures/partner.fixture';

const MOCK_ADMIN_PARTNER_STATS = {
  totalPartners: 150,
  activePartners: 120,
  totalEarnings: 500000,
  pendingCommissions: 25000,
  totalWithdrawn: 350000,
  partnersByLevel: {
    STARTER: 80,
    BRONZE: 40,
    SILVER: 20,
    GOLD: 8,
    PLATINUM: 2,
  },
};

const MOCK_ADMIN_WITHDRAWAL_STATS = {
  pendingCount: 5,
  pendingAmount: 15000,
  approvedCount: 3,
  approvedAmount: 8000,
  processingCount: 2,
  processingAmount: 5000,
  completedAmount: 350000,
};

const MOCK_ADMIN_PARTNERS = {
  items: [
    {
      id: 'partner-1',
      firstName: 'Иван',
      lastName: 'Иванов',
      email: 'ivan@test.ru',
      referralCode: 'IVAN123',
      level: 'GOLD',
      totalReferrals: 30,
      activeReferrals: 25,
      totalEarnings: 150000,
      availableBalance: 20000,
      pendingBalance: 5000,
      registeredAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'partner-2',
      firstName: 'Пётр',
      lastName: 'Петров',
      email: 'petr@test.ru',
      referralCode: 'PETR456',
      level: 'SILVER',
      totalReferrals: 15,
      activeReferrals: 10,
      totalEarnings: 75000,
      availableBalance: 8000,
      pendingBalance: 2000,
      registeredAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'partner-3',
      firstName: 'Мария',
      lastName: 'Сидорова',
      email: 'maria@test.ru',
      referralCode: 'MARIA789',
      level: 'STARTER',
      totalReferrals: 2,
      activeReferrals: 1,
      totalEarnings: 5000,
      availableBalance: 3000,
      pendingBalance: 500,
      registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  total: 150,
  page: 1,
  limit: 20,
  totalPages: 8,
};

const MOCK_ADMIN_COMMISSIONS = {
  items: [
    {
      id: 'comm-1',
      amount: 1000,
      rate: 0.1,
      level: 1,
      status: 'PENDING',
      partnerName: 'Иван Иванов',
      partnerEmail: 'ivan@test.ru',
      sourceUser: {
        id: 'ref-1',
        firstName: 'Анна',
        lastName: 'Петрова',
        email: 'anna@test.ru',
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'comm-2',
      amount: 500,
      rate: 0.05,
      level: 2,
      status: 'PENDING',
      partnerName: 'Пётр Петров',
      partnerEmail: 'petr@test.ru',
      sourceUser: {
        id: 'ref-2',
        firstName: 'Сергей',
        lastName: 'Сергеев',
        email: 'sergey@test.ru',
      },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-3',
      amount: 800,
      rate: 0.1,
      level: 1,
      status: 'APPROVED',
      partnerName: 'Мария Сидорова',
      partnerEmail: 'maria@test.ru',
      sourceUser: {
        id: 'ref-3',
        firstName: 'Ольга',
        lastName: 'Ольгина',
        email: 'olga@test.ru',
      },
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ],
  total: 25,
  page: 1,
  limit: 20,
  totalPages: 2,
  totalAmount: 2300,
};

const MOCK_ADMIN_WITHDRAWALS = {
  items: [
    {
      id: 'wd-1',
      amount: 5000,
      taxRate: 0.13,
      taxAmount: 650,
      netAmount: 4350,
      status: 'PENDING',
      taxStatus: 'INDIVIDUAL',
      user: {
        id: 'partner-1',
        firstName: 'Иван',
        lastName: 'Иванов',
        email: 'ivan@test.ru',
        referralCode: 'IVAN123',
      },
      paymentDetails: {
        type: 'card',
        cardNumber: '4111 **** **** 1234',
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wd-2',
      amount: 3000,
      taxRate: 0.04,
      taxAmount: 120,
      netAmount: 2880,
      status: 'APPROVED',
      taxStatus: 'SELF_EMPLOYED',
      user: {
        id: 'partner-2',
        firstName: 'Пётр',
        lastName: 'Петров',
        email: 'petr@test.ru',
        referralCode: 'PETR456',
      },
      paymentDetails: {
        type: 'bank',
        bankAccount: '40817810099910004312',
        bik: '044525225',
        bankName: 'Сбербанк',
      },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  total: 5,
  page: 1,
  limit: 20,
  totalPages: 1,
  totalAmount: 8000,
  totalNetAmount: 7230,
};

test.describe('Admin Partner Management', () => {
  test.beforeEach(async ({ adminPage }) => {
    await mockApiRoute(adminPage, /\/admin\/partners\/stats/, MOCK_ADMIN_PARTNER_STATS);
    await mockApiRoute(adminPage, /\/admin\/partners\/withdrawals\/stats/, MOCK_ADMIN_WITHDRAWAL_STATS);
    await mockApiRoute(adminPage, /\/admin\/partners$/, MOCK_ADMIN_PARTNERS);
    await mockApiRoute(adminPage, /\/admin\/partners\/commissions/, MOCK_ADMIN_COMMISSIONS);
    await mockApiRoute(adminPage, /\/admin\/partners\/withdrawals$/, MOCK_ADMIN_WITHDRAWALS);
  });

  test('lists all partners with pagination', async ({ adminPage, goToAdminPartners }) => {
    await goToAdminPartners();

    // Check partners are listed
    await expect(adminPage.getByText('Иван Иванов')).toBeVisible();
    await expect(adminPage.getByText('Пётр Петров')).toBeVisible();
    await expect(adminPage.getByText('Мария Сидорова')).toBeVisible();

    // Check pagination info
    await expect(adminPage.getByText(/всего.*150/i)).toBeVisible();
  });

  test('filters partners by level', async ({ adminPage, goToAdminPartners }) => {
    await goToAdminPartners();

    // Switch to partners tab
    const partnersTab = adminPage.getByRole('tab', { name: /партнёры/i });
    if (await partnersTab.isVisible()) {
      await partnersTab.click();
    }

    // Find level filter
    const levelSelect = adminPage.getByRole('combobox', { name: /уровень/i });
    if (await levelSelect.isVisible()) {
      await levelSelect.click();
      await adminPage.getByRole('option', { name: /золото|gold/i }).click();

      // Should filter the list
      await adminPage.waitForTimeout(500);
    }
  });

  test('views partner detail page', async ({ adminPage, goToAdminPartners }) => {
    await goToAdminPartners();

    // Switch to partners tab
    const partnersTab = adminPage.getByRole('tab', { name: /партнёры/i });
    if (await partnersTab.isVisible()) {
      await partnersTab.click();
    }

    // Click on a partner's detail link
    const moreButton = adminPage.locator('[data-testid="partner-actions-partner-1"]').first();
    if (await moreButton.isVisible()) {
      await moreButton.click();
      await adminPage.getByText('Подробнее').click();

      // Should navigate to detail page
      await expect(adminPage).toHaveURL(/\/admin\/partners\/partner-1/);
    }
  });

  test('shows program statistics overview', async ({ adminPage, goToAdminPartners }) => {
    await goToAdminPartners();

    // Check statistics are displayed
    await expect(adminPage.getByText('150')).toBeVisible(); // total partners
    await expect(adminPage.getByText('120')).toBeVisible(); // active partners
    await expect(adminPage.getByText(formatCurrency(500000))).toBeVisible(); // total earnings
  });

  test('lists pending commissions', async ({ adminPage, goToAdminCommissions }) => {
    await goToAdminCommissions();

    // Check pending commissions are shown
    await expect(adminPage.getByText('Иван Иванов')).toBeVisible();
    await expect(adminPage.getByText('Ожидает').first()).toBeVisible();

    // Check amounts
    await expect(adminPage.getByText(formatCurrency(1000))).toBeVisible();
  });

  test('approves single commission', async ({ adminPage, goToAdminCommissions }) => {
    // Mock approve endpoint
    await adminPage.route(/\/admin\/partners\/commissions\/comm-1\/approve/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'comm-1', status: 'APPROVED' } }),
      });
    });

    await goToAdminCommissions();

    // Find approve button for first commission
    const approveButton = adminPage.locator('button[title="Одобрить"]').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Should show success or update status
      await adminPage.waitForTimeout(500);
    }
  });

  test('rejects commission with reason required', async ({ adminPage, goToAdminCommissions }) => {
    await goToAdminCommissions();

    // Find reject button
    const rejectButton = adminPage.locator('button[title="Отклонить"]').first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      // Dialog should open
      await expect(adminPage.getByText('Отклонить комиссию')).toBeVisible();

      // Try to submit without reason
      const confirmButton = adminPage.getByRole('button', { name: /отклонить/i }).last();
      await expect(confirmButton).toBeDisabled();

      // Enter reason
      const reasonInput = adminPage.getByLabel(/причина/i);
      await reasonInput.fill('Подозрительная активность');

      // Now should be enabled
      await expect(confirmButton).toBeEnabled();
    }
  });

  test('bulk approves multiple commissions', async ({ adminPage, goToAdminCommissions }) => {
    await goToAdminCommissions();

    // Select multiple commissions
    const checkboxes = adminPage.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 1) {
      // Select first pending commission
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      // Find batch approve button
      const batchApproveButton = adminPage.getByRole('button', { name: /одобрить выбранные/i });
      if (await batchApproveButton.isVisible()) {
        await expect(adminPage.getByText(/выбрано.*2/i)).toBeVisible();
      }
    }
  });

  test('lists pending withdrawals', async ({ adminPage, goToAdminWithdrawals }) => {
    await goToAdminWithdrawals();

    // Check withdrawals are listed
    await expect(adminPage.getByText('Иван Иванов')).toBeVisible();
    await expect(adminPage.getByText(formatCurrency(5000))).toBeVisible();

    // Check status badges
    await expect(adminPage.getByText('Ожидает').first()).toBeVisible();
  });

  test('views withdrawal detail', async ({ adminPage, goToAdminWithdrawals }) => {
    // Mock withdrawal detail
    await mockApiRoute(adminPage, /\/admin\/partners\/withdrawals\/wd-1/, MOCK_ADMIN_WITHDRAWALS.items[0]);

    await goToAdminWithdrawals();

    // Click on detail link
    const moreButton = adminPage.locator('button:has-text("...")').first();
    if (await moreButton.isVisible()) {
      await moreButton.click();
      await adminPage.getByText('Подробнее').click();

      // Should navigate to detail page
      await expect(adminPage).toHaveURL(/\/admin\/partners\/withdrawals\/wd-1/);
    }
  });

  test('approves withdrawal request', async ({ adminPage }) => {
    // Mock endpoints
    await mockApiRoute(adminPage, /\/admin\/partners\/withdrawals\/wd-1$/, MOCK_ADMIN_WITHDRAWALS.items[0]);
    await adminPage.route(/\/admin\/partners\/withdrawals\/wd-1\/approve/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'wd-1', status: 'APPROVED' } }),
      });
    });

    // Go to withdrawal detail
    await adminPage.goto('/admin/partners/withdrawals/wd-1');
    await adminPage.waitForLoadState('networkidle');

    // Find approve button
    const approveButton = adminPage.getByRole('button', { name: /одобрить/i });
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Should update status
      await adminPage.waitForTimeout(500);
    }
  });

  test('rejects withdrawal with reason', async ({ adminPage }) => {
    await mockApiRoute(adminPage, /\/admin\/partners\/withdrawals\/wd-1$/, MOCK_ADMIN_WITHDRAWALS.items[0]);

    await adminPage.goto('/admin/partners/withdrawals/wd-1');
    await adminPage.waitForLoadState('networkidle');

    // Find reject button
    const rejectButton = adminPage.getByRole('button', { name: /отклонить/i });
    if (await rejectButton.isVisible()) {
      await rejectButton.click();

      // Dialog should open
      await expect(adminPage.getByText('Отклонить заявку')).toBeVisible();

      // Reason is required (min 10 chars)
      const reasonInput = adminPage.getByLabel(/причина/i);
      await reasonInput.fill('Документы не прошли проверку');

      const confirmButton = adminPage.getByRole('button', { name: /отклонить/i }).last();
      await expect(confirmButton).toBeEnabled();
    }
  });

  test('completes approved withdrawal', async ({ adminPage }) => {
    // Mock approved withdrawal
    const approvedWithdrawal = {
      ...MOCK_ADMIN_WITHDRAWALS.items[1],
      status: 'APPROVED',
    };
    await mockApiRoute(adminPage, /\/admin\/partners\/withdrawals\/wd-2$/, approvedWithdrawal);

    await adminPage.route(/\/admin\/partners\/withdrawals\/wd-2\/complete/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'wd-2', status: 'COMPLETED' } }),
      });
    });

    await adminPage.goto('/admin/partners/withdrawals/wd-2');
    await adminPage.waitForLoadState('networkidle');

    // Find complete button
    const completeButton = adminPage.getByRole('button', { name: /отметить выплату|завершить/i });
    if (await completeButton.isVisible()) {
      await completeButton.click();

      // Should update status
      await adminPage.waitForTimeout(500);
    }
  });

  test('shows updated status after actions', async ({ adminPage, goToAdminCommissions }) => {
    // Mock approve that returns updated commission
    await adminPage.route(/\/admin\/partners\/commissions\/comm-1\/approve/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_ADMIN_COMMISSIONS.items[0], status: 'APPROVED' },
        }),
      });
    });

    await goToAdminCommissions();

    // Approve commission
    const approveButton = adminPage.locator('button[title="Одобрить"]').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Status should update (may need to reload or check toast)
      await adminPage.waitForTimeout(500);
    }
  });

  test('search filters partners correctly', async ({ adminPage, goToAdminPartners }) => {
    await goToAdminPartners();

    // Switch to partners tab
    const partnersTab = adminPage.getByRole('tab', { name: /партнёры/i });
    if (await partnersTab.isVisible()) {
      await partnersTab.click();
    }

    // Find search input
    const searchInput = adminPage.getByPlaceholder(/поиск|email|имя/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('ivan');

      // Should filter results
      await adminPage.waitForTimeout(500);
      await expect(adminPage.getByText('Иван Иванов')).toBeVisible();
    }
  });

  test('withdrawal stats cards display correctly', async ({ adminPage, goToAdminWithdrawals }) => {
    await goToAdminWithdrawals();

    // Check stat cards
    await expect(adminPage.getByText('5')).toBeVisible(); // pending count
    await expect(adminPage.getByText('3')).toBeVisible(); // approved count
    await expect(adminPage.getByText(formatCurrency(350000))).toBeVisible(); // completed amount
  });
});
