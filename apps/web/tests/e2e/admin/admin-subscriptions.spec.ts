import { test, expect } from '@playwright/test';

/**
 * Admin Subscriptions E2E Tests
 *
 * Tests for subscription management functionality:
 * - Subscriptions list display
 * - Filtering and searching
 * - Extend/cancel actions
 */

test.describe('Admin Subscriptions', () => {
  test.describe('Authentication & Access', () => {
    test('should redirect unauthenticated users', async ({ page }) => {
      await page.context().clearCookies();

      await page.goto('/admin/subscriptions');

      // Should redirect to login
      await expect(page).toHaveURL(/\/(login|auth)/);
    });
  });

  test.describe('Subscriptions Page', () => {
    test.skip('should display subscriptions header', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Check page header
      await expect(page.locator('h1')).toContainText('Подписки');
      await expect(page.getByText('Управление подписками и тарифами')).toBeVisible();
    });

    test.skip('should display stats cards', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Check stats cards
      await expect(page.getByText('Активные')).toBeVisible();
      await expect(page.getByText('Истекают скоро')).toBeVisible();
      await expect(page.getByText('Отменённые')).toBeVisible();
      await expect(page.getByText('Доход за месяц')).toBeVisible();
    });

    test.skip('should display data table with subscriptions', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Check for table
      const table = page.locator('table');
      await expect(table).toBeVisible();

      // Check for column headers
      await expect(page.getByRole('columnheader', { name: 'Пользователь' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Тариф' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Статус' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Цена' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Истекает' })).toBeVisible();
    });
  });

  test.describe('Filtering', () => {
    test.skip('should filter by status', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Click status filter
      await page.click('button:has-text("Статус")');

      // Select Активные option
      await page.click('text=Активные');

      // Table should be filtered
      const rows = page.locator('tbody tr');
      const count = await rows.count();

      // All visible rows should have Активен status
      for (let i = 0; i < Math.min(count, 5); i++) {
        const statusBadge = rows.nth(i).locator('text=Активен');
        await expect(statusBadge).toBeVisible();
      }
    });

    test.skip('should filter by plan type', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Click plan type filter
      await page.click('button:has-text("Тип тарифа")');

      // Select Премиум option
      await page.click('text=Премиум');

      // Table should be filtered
      const rows = page.locator('tbody tr');
      const count = await rows.count();

      // All visible rows should have Премиум plan
      for (let i = 0; i < Math.min(count, 5); i++) {
        const planBadge = rows.nth(i).locator('text=Премиум');
        await expect(planBadge).toBeVisible();
      }
    });

    test.skip('should search by email', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Type in search input
      await page.fill('input[placeholder*="Поиск"]', 'john');

      // Wait for results to filter
      await page.waitForTimeout(500);

      // Table should show filtered results
      await expect(page.getByText('john.doe@example.com')).toBeVisible();
    });
  });

  test.describe('Subscription Display', () => {
    test.skip('should show expiring soon indicator', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Look for expiring soon indicators (subscriptions with < 7 days)
      const expiringIndicator = page.locator('text=/Осталось \\d+ дн/i');

      // If there are expiring subscriptions, they should have warning styling
      if (await expiringIndicator.count() > 0) {
        await expect(expiringIndicator.first()).toBeVisible();
      }
    });

    test.skip('should show auto-renew status', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Check for auto-renew column
      await expect(page.getByRole('columnheader', { name: 'Автопродление' })).toBeVisible();

      // Should show Да/Нет values
      const yesValues = page.locator('tbody').locator('text=Да');
      const noValues = page.locator('tbody').locator('text=Нет');

      const totalCount = (await yesValues.count()) + (await noValues.count());
      expect(totalCount).toBeGreaterThan(0);
    });

    test.skip('should display price in rubles', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Check for price column with ruble formatting
      const priceCell = page.locator('tbody tr').first().locator('td').nth(3);
      const priceText = await priceCell.textContent();

      // Should contain ruble symbol or RUB
      expect(priceText).toMatch(/[\u20BD₽]|RUB|руб/);
    });
  });

  test.describe('Row Actions', () => {
    test.skip('should show action menu', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Click on actions button of first row
      const firstRowActions = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]');
      await firstRowActions.click();

      // Action menu should appear
      await expect(page.getByText('Подробнее')).toBeVisible();
      await expect(page.getByText('Продлить подписку')).toBeVisible();
      await expect(page.getByText('Отменить подписку')).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test.skip('should show pagination controls', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      // Check for pagination
      await expect(page.getByText('Page 1 of')).toBeVisible();
      await expect(page.locator('button:has-text("Назад")')).toBeVisible();
      await expect(page.locator('button:has-text("Вперёд")')).toBeVisible();
    });
  });
});

test.describe('Admin Subscription Actions', () => {
  test.skip('should extend subscription', async ({ page }) => {
    await page.goto('/admin/subscriptions');

    // Find an active subscription
    const activeRow = page.locator('tbody tr').filter({ hasText: 'Активен' }).first();

    // Click actions
    await activeRow.locator('button[aria-haspopup="menu"]').click();

    // Click Extend
    await page.click('text=Продлить подписку');

    // Fill extension form
    await page.fill('input[name="days"]', '30');
    await page.fill('textarea[name="reason"]', 'Решение службы поддержки');

    // Confirm
    await page.click('button:has-text("Продлить")');

    // Should show success
    await expect(page.getByText(/extended|success/i)).toBeVisible();
  });

  test.skip('should cancel subscription', async ({ page }) => {
    await page.goto('/admin/subscriptions');

    // Find an active subscription
    const activeRow = page.locator('tbody tr').filter({ hasText: 'Активен' }).first();

    // Click actions
    await activeRow.locator('button[aria-haspopup="menu"]').click();

    // Click Cancel
    await page.click('text=Отменить подписку');

    // Fill cancellation reason
    await page.fill('textarea[name="reason"]', 'Обнаружена мошенническая активность');

    // Confirm cancellation
    await page.click('button:has-text("Отменить подписку")');

    // Should show success
    await expect(page.getByText(/cancelled|success/i)).toBeVisible();
  });
});

test.describe('Admin Subscription Metrics', () => {
  test.skip('should display correct monthly revenue', async ({ page }) => {
    await page.goto('/admin/subscriptions');

    // Find monthly revenue card
    const revenueCard = page.locator('[data-testid="stats-card"]').filter({ hasText: 'Доход за месяц' });
    await expect(revenueCard).toBeVisible();

    // Value should be formatted as currency
    const valueText = await revenueCard.locator('[class*="font-bold"]').textContent();
    expect(valueText).toMatch(/[\u20BD₽]|RUB|руб|\d+/);
  });

  test.skip('should show revenue trend', async ({ page }) => {
    await page.goto('/admin/subscriptions');

    // Find trend indicator on revenue card
    const revenueCard = page.locator('[data-testid="stats-card"]').filter({ hasText: 'Доход за месяц' });
    const trendIndicator = revenueCard.locator('[class*="text-mp-success"]');

    // Should have trend percentage
    if (await trendIndicator.count() > 0) {
      const trendText = await trendIndicator.textContent();
      expect(trendText).toMatch(/\d+%/);
    }
  });
});
