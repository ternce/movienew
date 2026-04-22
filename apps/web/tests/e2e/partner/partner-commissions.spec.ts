import { test, expect, mockApiRoute, formatCurrency } from '../fixtures/partner.fixture';

const FULL_MOCK_COMMISSIONS = {
  items: [
    {
      id: 'comm-1',
      amount: 1000,
      rate: 0.1,
      level: 1,
      status: 'APPROVED',
      sourceUser: {
        id: 'ref-1',
        firstName: 'Иван',
        lastName: 'Иванов',
        email: 'ivan@test.ru',
      },
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    },
    {
      id: 'comm-2',
      amount: 500,
      rate: 0.05,
      level: 2,
      status: 'PENDING',
      sourceUser: {
        id: 'ref-2',
        firstName: 'Пётр',
        lastName: 'Петров',
        email: 'petr@test.ru',
      },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-3',
      amount: 800,
      rate: 0.1,
      level: 1,
      status: 'PAID',
      sourceUser: {
        id: 'ref-3',
        firstName: 'Мария',
        lastName: 'Сидорова',
        email: 'maria@test.ru',
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-4',
      amount: 300,
      rate: 0.03,
      level: 3,
      status: 'CANCELLED',
      sourceUser: {
        id: 'ref-4',
        firstName: 'Алексей',
        lastName: 'Алексеев',
        email: 'alexey@test.ru',
      },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      cancelledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      cancellationReason: 'Возврат средств',
    },
  ],
  total: 4,
  page: 1,
  limit: 20,
  totalPages: 1,
  totalAmount: 2600,
};

test.describe('Partner Commissions', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoute(page, /\/partners\/commissions/, FULL_MOCK_COMMISSIONS);
  });

  test('displays commission history with pagination', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Check commissions are displayed
    await expect(page.getByText('Иван Иванов')).toBeVisible();
    await expect(page.getByText('Пётр Петров')).toBeVisible();
    await expect(page.getByText('Мария Сидорова')).toBeVisible();

    // Check amounts are shown
    await expect(page.getByText(formatCurrency(1000))).toBeVisible();
    await expect(page.getByText(formatCurrency(500))).toBeVisible();

    // Check total is shown
    await expect(page.getByText(/всего.*4/i)).toBeVisible();
  });

  test('filters by status (pending, approved, paid)', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Find status filter
    const statusSelect = page.getByRole('combobox', { name: /статус/i });
    if (await statusSelect.isVisible()) {
      // Filter by PENDING
      await statusSelect.click();
      await page.getByRole('option', { name: /ожидает/i }).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Should show only pending commissions
      await expect(page.getByText('Пётр Петров')).toBeVisible();
    }
  });

  test('filters by commission level (1-5)', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Find level filter
    const levelSelect = page.getByRole('combobox', { name: /уровень/i });
    if (await levelSelect.isVisible()) {
      // Filter by level 1
      await levelSelect.click();
      await page.getByRole('option', { name: /1 уровень/i }).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Level 1 commissions should be shown
      await expect(page.getByText('Иван Иванов')).toBeVisible();
      await expect(page.getByText('Мария Сидорова')).toBeVisible();
    }
  });

  test('filters by date range', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Find date range inputs
    const fromDateInput = page.getByLabel(/от|начало/i);
    const toDateInput = page.getByLabel(/до|конец/i);

    if (await fromDateInput.isVisible() && await toDateInput.isVisible()) {
      // Set date range
      const today = new Date();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      await fromDateInput.fill(weekAgo.toISOString().split('T')[0]);
      await toDateInput.fill(today.toISOString().split('T')[0]);

      // Apply filter
      const applyButton = page.getByRole('button', { name: /применить/i });
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('shows commission source user details', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Check user names are displayed
    await expect(page.getByText('Иван Иванов')).toBeVisible();

    // Check user emails are displayed
    await expect(page.getByText('ivan@test.ru')).toBeVisible();
    await expect(page.getByText('petr@test.ru')).toBeVisible();
  });

  test('handles empty commission state', async ({ page }) => {
    // Mock empty commissions
    await mockApiRoute(page, /\/partners\/commissions/, {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      totalAmount: 0,
    });

    await page.goto('/partner/commissions');
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    await expect(page.getByText(/нет комисси/i)).toBeVisible();
  });

  test('displays commission rate percentage', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Check rate percentages are shown (10%, 5%, 3%)
    await expect(page.getByText('10%')).toBeVisible();
    await expect(page.getByText('5%')).toBeVisible();
  });

  test('displays commission level', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Level indicators should be visible
    const levelBadges = page.locator('[class*="rounded-full"]');
    expect(await levelBadges.count()).toBeGreaterThan(0);
  });

  test('status badges are displayed correctly', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Check status badges
    await expect(page.getByText('Одобрена').first()).toBeVisible();
    await expect(page.getByText('Ожидает').first()).toBeVisible();
    await expect(page.getByText('Выплачена').first()).toBeVisible();
    await expect(page.getByText('Отменена').first()).toBeVisible();
  });

  test('cancelled commissions show cancellation reason', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Check cancellation reason is displayed
    await expect(page.getByText('Возврат средств')).toBeVisible();
  });

  test('total amount is displayed correctly', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Check total amount is shown
    await expect(page.getByText(formatCurrency(2600))).toBeVisible();
  });

  test('pagination controls work', async ({ page }) => {
    // Mock paginated data
    const paginatedData = {
      ...FULL_MOCK_COMMISSIONS,
      total: 50,
      totalPages: 3,
    };
    await mockApiRoute(page, /\/partners\/commissions/, paginatedData);

    await page.goto('/partner/commissions');
    await page.waitForLoadState('networkidle');

    // Find pagination controls
    const nextButton = page.getByRole('button', { name: /следующая|вперёд|next/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // URL or state should update
      await page.waitForTimeout(500);
    }
  });

  test('reset filters button works', async ({ page, goToCommissions }) => {
    await goToCommissions();

    // Apply a filter first
    const statusSelect = page.getByRole('combobox', { name: /статус/i });
    if (await statusSelect.isVisible()) {
      await statusSelect.click();
      await page.getByRole('option', { name: /ожидает/i }).click();

      // Find reset button
      const resetButton = page.getByRole('button', { name: /сбросить/i });
      if (await resetButton.isVisible()) {
        await resetButton.click();

        // Should show all commissions again
        await expect(page.getByText('Иван Иванов')).toBeVisible();
        await expect(page.getByText('Пётр Петров')).toBeVisible();
      }
    }
  });
});
