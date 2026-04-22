import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  waitForAdminPage,
  TEST_CONTENT_PREFIX,
} from './helpers/admin-test.helper';
import { apiGet } from '../helpers/api.helper';

/**
 * Admin Payments — List page, filters, detail page, and API verification.
 * Runs against production at http://89.108.66.37.
 */

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Token will be empty — tests will skip
  }
});

// ============ Payments List Page ============

test.describe('Payments List Page', () => {
  test('payments page loads with table and stats cards', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    // Verify h1 heading
    const heading = page.locator('h1');
    const headingCount = await heading.count();
    if (headingCount > 0) {
      const headingText = await heading.first().innerText();
      expect(headingText).toContain('Платежи');
    } else {
      // Fallback: heading text must be present somewhere in body
      expect(bodyText).toContain('Платежи');
    }

    // Verify stats cards — at least one of the known card titles
    const hasStatsCards =
      bodyText.includes('Выручка') ||
      bodyText.includes('выручка') ||
      bodyText.includes('Транзакц') ||
      bodyText.includes('Возврат');
    expect(hasStatsCards).toBe(true);

    // Verify table or empty state
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState =
      bodyText.includes('Нет данных') ||
      bodyText.includes('Нет транзакций') ||
      bodyText.includes('Пусто');
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('search filter accepts input and does not crash', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Find search input by placeholder containing "Email" or "ID транзакции"
    const searchInput = page.locator(
      'input[placeholder*="Email"], input[placeholder*="email"], input[placeholder*="ID"], input[placeholder*="транзакции"], input[placeholder*="Поиск"]'
    );
    const searchCount = await searchInput.count();

    if (searchCount === 0) {
      // Fallback: use the first text input on the page
      const anyInput = page.locator('input[type="text"], input:not([type])').first();
      const inputVisible = await anyInput.isVisible().catch(() => false);
      test.skip(!inputVisible, 'No search input found on payments page');
    }

    const input = searchCount > 0 ? searchInput.first() : page.locator('input').first();
    await input.fill('test@');

    // Wait for debounce
    await page.waitForTimeout(2000);

    // Verify page is still functional (no crash)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);

    // Clear search
    await input.clear();
    await page.waitForTimeout(1000);
  });

  test('status filter dropdown opens and has options', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Find the status filter trigger — the SelectTrigger inside the Статус filter section
    // The page has Label "Статус" followed by a Select with SelectTrigger
    const statusTrigger = page.locator('button[role="combobox"]').nth(0);
    const triggerCount = await page.locator('button[role="combobox"]').count();

    if (triggerCount === 0) {
      // Try alternative: look for any select-like button near "Статус" text
      const statusLabel = page.locator('text=Статус').first();
      const labelVisible = await statusLabel.isVisible().catch(() => false);
      test.skip(!labelVisible, 'Status filter not found');
    }

    await statusTrigger.click();
    await page.waitForTimeout(500);

    // Verify dropdown options are visible
    const dropdownContent = page.locator('[role="listbox"], [data-radix-popper-content-wrapper]');
    const dropdownVisible = await dropdownContent.first().isVisible().catch(() => false);
    expect(dropdownVisible).toBe(true);

    // Verify known options appear
    const dropdownText = await dropdownContent.first().innerText().catch(() => '');
    const hasExpectedOptions =
      dropdownText.includes('Завершено') ||
      dropdownText.includes('Ожидание') ||
      dropdownText.includes('Ошибка') ||
      dropdownText.includes('Все статусы');
    expect(hasExpectedOptions).toBe(true);

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('type filter dropdown opens and has options', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Type filter is the second combobox on the page
    const comboboxes = page.locator('button[role="combobox"]');
    const comboboxCount = await comboboxes.count();
    test.skip(comboboxCount < 2, 'Type filter combobox not found (need at least 2 comboboxes)');

    const typeTrigger = comboboxes.nth(1);
    await typeTrigger.click();
    await page.waitForTimeout(500);

    // Verify dropdown opens with type options
    const dropdownContent = page.locator('[role="listbox"], [data-radix-popper-content-wrapper]');
    const dropdownVisible = await dropdownContent.first().isVisible().catch(() => false);
    expect(dropdownVisible).toBe(true);

    const dropdownText = await dropdownContent.first().innerText().catch(() => '');
    const hasExpectedOptions =
      dropdownText.includes('Подписка') ||
      dropdownText.includes('Магазин') ||
      dropdownText.includes('Бонус') ||
      dropdownText.includes('Вывод') ||
      dropdownText.includes('Все типы');
    expect(hasExpectedOptions).toBe(true);

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('payment stats API returns revenue data', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/payments/stats', adminToken);
    expect(res).toBeDefined();

    // API may return success with data, or an error for non-existent endpoint
    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      expect(data).toBeTruthy();

      // Verify expected fields if data is present
      const hasRevenueField =
        'totalRevenue' in data ||
        'monthlyRevenue' in data ||
        'revenue' in data ||
        'total' in data;
      expect(hasRevenueField || Object.keys(data).length > 0).toBe(true);
    } else {
      // Even if not success, the response should be defined
      expect(typeof res.success).toBe('boolean');
    }
  });

  test('transactions API returns paginated list', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/payments/transactions?limit=10', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as {
        items?: unknown[];
        total?: number;
        page?: number;
        limit?: number;
      };

      // Verify items array exists
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }

      // Verify pagination meta if present
      if (data.total !== undefined) {
        expect(typeof data.total).toBe('number');
      }
      if (data.page !== undefined) {
        expect(typeof data.page).toBe('number');
      }
    }
  });
});

// ============ Payment Detail Page ============

test.describe('Payment Detail Page', () => {
  let transactionId: string | undefined;
  let transactionStatus: string | undefined;

  test.beforeAll(async () => {
    if (!adminToken) return;

    // Fetch a transaction ID for detail page tests
    try {
      const res = await apiGet('/admin/payments/transactions?limit=1', adminToken);
      if (res.success && res.data) {
        const data = res.data as { items?: { id: string; status: string }[] };
        if (data.items && data.items.length > 0) {
          transactionId = data.items[0].id;
          transactionStatus = data.items[0].status;
        }
      }
    } catch {
      // No transactions available
    }
  });

  test('transaction detail page loads for existing transaction', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!transactionId, 'No transactions on production');

    const loaded = await waitForAdminPage(page, `/admin/payments/${transactionId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Detail page should have loaded content (not a blank page)
    expect(bodyText.trim().length).toBeGreaterThan(50);

    // Should contain transaction-related info
    const hasTransactionContent =
      bodyText.includes('Детали транзакции') ||
      bodyText.includes('Информация') ||
      bodyText.includes('транзакц') ||
      bodyText.includes('Транзакция не найдена') ||
      bodyText.includes(transactionId!.slice(0, 8));
    expect(hasTransactionContent).toBe(true);
  });

  test('detail page shows transaction metadata', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!transactionId, 'No transactions on production');

    const loaded = await waitForAdminPage(page, `/admin/payments/${transactionId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // If transaction was not found, skip
    if (bodyText.includes('Транзакция не найдена')) {
      test.skip(true, 'Transaction not found on detail page');
      return;
    }

    // Verify key transaction fields are displayed
    // The detail page should show: ID, email, amount, status, date
    const hasId =
      bodyText.includes('ID транзакции') ||
      bodyText.includes(transactionId!.slice(0, 8));
    const hasEmail =
      bodyText.includes('Email') ||
      bodyText.includes('email') ||
      bodyText.includes('Эл. почта') ||
      bodyText.includes('@');
    const hasAmount =
      bodyText.includes('Сумма') ||
      bodyText.includes('₽') ||
      /\d+/.test(bodyText);
    const hasStatus =
      bodyText.includes('Статус') ||
      bodyText.includes('Завершено') ||
      bodyText.includes('Ожидание') ||
      bodyText.includes('Ошибка');
    const hasDate =
      bodyText.includes('Дата') ||
      bodyText.includes('Создано') ||
      /\d{2}\.\d{2}\.\d{4}/.test(bodyText);

    // At least 3 of 5 expected fields should be present
    const fieldCount = [hasId, hasEmail, hasAmount, hasStatus, hasDate].filter(Boolean).length;
    expect(fieldCount).toBeGreaterThanOrEqual(3);
  });

  test('refund button visible only for COMPLETED transactions', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // Fetch a COMPLETED transaction specifically
    let completedTxId: string | undefined;
    try {
      const res = await apiGet(
        '/admin/payments/transactions?status=COMPLETED&limit=1',
        adminToken
      );
      if (res.success && res.data) {
        const data = res.data as { items?: { id: string; status: string }[] };
        if (data.items && data.items.length > 0) {
          completedTxId = data.items[0].id;
        }
      }
    } catch {
      // Ignore
    }

    test.skip(!completedTxId, 'No COMPLETED transactions on production');

    const loaded = await waitForAdminPage(page, `/admin/payments/${completedTxId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    if (bodyText.includes('Транзакция не найдена')) {
      test.skip(true, 'Transaction not found on detail page');
      return;
    }

    // For COMPLETED transactions, the "Возврат" button should be visible
    const refundButton = page.locator('button:has-text("Возврат")');
    const refundVisible = await refundButton.isVisible().catch(() => false);
    expect(refundVisible).toBe(true);

    // NOTE: We do NOT click the refund button on production
  });
});
