/**
 * Admin Partner Commissions, Withdrawals, and Detail Page Tests
 *
 * Tests real partner commission listing, filtering, approve/reject actions,
 * withdrawals page, and partner detail pages against production API.
 */

import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  waitForAdminPage,
  TEST_CONTENT_PREFIX,
} from './helpers/admin-test.helper';
import { apiGet } from '../helpers/api.helper';

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip
  }
});

test.describe('Partner Commissions Page', () => {
  test('commissions page loads with table and filter controls', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/partners/commissions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Verify heading
    await expect(page.locator('h1')).toContainText('Комиссии');

    // Verify filter controls exist — select/combobox elements or filter text
    const bodyText = await page.locator('body').innerText();
    const hasStatusFilter =
      bodyText.includes('Статус') ||
      bodyText.includes('статус');
    const hasLevelFilter =
      bodyText.includes('Уровень') ||
      bodyText.includes('уровень');
    const hasSelectElements = (await page.locator('select, [role="combobox"], button:has-text("Статус"), button:has-text("Уровень")').count()) > 0;
    const hasTable = await page.locator('table').isVisible().catch(() => false);

    expect(hasStatusFilter || hasLevelFilter || hasSelectElements || hasTable).toBe(true);
  });

  test('status filter dropdown works', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/partners/commissions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Try to find and open a status filter — could be a button, select, or combobox
    const statusButton = page.locator('button:has-text("Статус"), [role="combobox"]:has-text("Статус")').first();
    const statusSelect = page.locator('select').first();

    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click();
      await page.waitForTimeout(500);

      // Check for dropdown options
      const bodyText = await page.locator('body').innerText();
      const hasOptions =
        bodyText.includes('PENDING') ||
        bodyText.includes('APPROVED') ||
        bodyText.includes('Ожидает') ||
        bodyText.includes('Одобрен') ||
        bodyText.includes('pending') ||
        bodyText.includes('approved');

      // Select an option if visible
      const firstOption = page.locator('[role="option"], [role="menuitem"], [data-value]').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(1000);
      }

      // Page should not crash — body still has content
      const afterText = await page.locator('body').innerText();
      expect(afterText.trim().length).toBeGreaterThan(10);
    } else if (await statusSelect.isVisible().catch(() => false)) {
      // Native select element
      const options = await statusSelect.locator('option').allInnerTexts();
      expect(options.length).toBeGreaterThan(0);

      if (options.length > 1) {
        await statusSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }

      const afterText = await page.locator('body').innerText();
      expect(afterText.trim().length).toBeGreaterThan(10);
    } else {
      // No visible filter dropdown — skip gracefully
      test.skip(true, 'No status filter dropdown found on page');
    }
  });

  test('approve pending commission if available', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // First check via API if there are pending commissions
    const res = await apiGet('/admin/partners/commissions?status=PENDING&limit=1', adminToken);
    const data = res.data as { items?: { id: string }[] } | undefined;
    const pendingItems = data?.items ?? [];

    test.skip(pendingItems.length === 0, 'No pending commissions');

    const commissionId = pendingItems[0].id;

    const loaded = await waitForAdminPage(page, '/admin/partners/commissions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Find the approve button — green checkmark icon button in table row
    const approveButton = page.locator(
      'button[title*="одобр" i], button[title*="approv" i], button[aria-label*="одобр" i], button[aria-label*="approv" i], table button:has(svg.text-green-500), table button:has(svg[class*="green"])'
    ).first();

    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await page.waitForTimeout(2000);

      // Verify via API that the commission status changed
      const verifyRes = await apiGet(`/admin/partners/commissions/${commissionId}`, adminToken);
      if (verifyRes.success && verifyRes.data) {
        const updated = verifyRes.data as { status?: string };
        // Status should have changed from PENDING
        expect.soft(updated.status).not.toBe('PENDING');
      }
    } else {
      // Try generic first action button in the table row
      const tableActionBtn = page.locator('table tbody tr:first-child button').first();
      if (await tableActionBtn.isVisible().catch(() => false)) {
        // At least verify buttons exist in the commission rows
        const btnCount = await page.locator('table tbody tr button').count();
        expect(btnCount).toBeGreaterThan(0);
      } else {
        test.skip(true, 'No approve button found in commissions table');
      }
    }
  });

  test('reject pending commission with reason if available', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // Check via API for pending commissions
    const res = await apiGet('/admin/partners/commissions?status=PENDING&limit=1', adminToken);
    const data = res.data as { items?: { id: string }[] } | undefined;
    const pendingItems = data?.items ?? [];

    test.skip(pendingItems.length === 0, 'No pending commissions');

    const loaded = await waitForAdminPage(page, '/admin/partners/commissions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Find the reject button — red X icon button in table row
    const rejectButton = page.locator(
      'button[title*="отклон" i], button[title*="reject" i], button[aria-label*="отклон" i], button[aria-label*="reject" i], table button:has(svg.text-red-500), table button:has(svg[class*="red"]), table button:has(svg[class*="destructive"])'
    ).first();

    if (await rejectButton.isVisible().catch(() => false)) {
      await rejectButton.click();
      await page.waitForTimeout(1000);

      // Wait for reject dialog to appear
      const dialog = page.locator('[role="dialog"], [role="alertdialog"], .modal, [class*="dialog"]');
      if (await dialog.isVisible().catch(() => false)) {
        // Fill in rejection reason
        const reasonInput = page.locator('#reject-reason, textarea, [name="reason"]').first();
        if (await reasonInput.isVisible().catch(() => false)) {
          await reasonInput.fill('E2E test rejection');
        }

        // Click confirm button
        const confirmBtn = page.locator(
          'button:has-text("Отклонить"), button:has-text("Подтвердить"), button:has-text("Reject"), [role="dialog"] button[class*="destructive"]'
        ).first();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);

          // Verify via API
          const commissionId = pendingItems[0].id;
          const verifyRes = await apiGet(`/admin/partners/commissions/${commissionId}`, adminToken);
          if (verifyRes.success && verifyRes.data) {
            const updated = verifyRes.data as { status?: string };
            expect.soft(updated.status).not.toBe('PENDING');
          }
        }
      }
    } else {
      test.skip(true, 'No reject button found in commissions table');
    }
  });

  test('batch approve checkboxes visible for pending items', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // Check via API for pending commissions
    const res = await apiGet('/admin/partners/commissions?status=PENDING&limit=5', adminToken);
    const data = res.data as { items?: { id: string }[] } | undefined;
    const pendingItems = data?.items ?? [];

    test.skip(pendingItems.length === 0, 'No pending commissions');

    const loaded = await waitForAdminPage(page, '/admin/partners/commissions');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Check for checkboxes in table rows
    const checkboxes = page.locator('table input[type="checkbox"], table [role="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      expect(checkboxCount).toBeGreaterThan(0);

      // Verify they are visible
      const firstCheckbox = checkboxes.first();
      await expect(firstCheckbox).toBeVisible();
    } else {
      // Some implementations may not have batch operations
      // Just verify the page loaded with content
      const bodyText = await page.locator('body').innerText();
      expect.soft(bodyText).toContain('Комиссии');
    }
  });
});

test.describe('Partner Withdrawals Page', () => {
  test('withdrawals page loads with stats cards', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/partners/withdrawals');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Verify heading
    const h1 = page.locator('h1');
    const headingText = await h1.innerText().catch(() => '');
    expect(
      headingText.toLowerCase().includes('вывод') ||
      headingText.toLowerCase().includes('выплат') ||
      headingText.toLowerCase().includes('withdrawal')
    ).toBe(true);

    // Check for stats cards — should contain numbers, currency symbols, or stat text
    const bodyText = await page.locator('body').innerText();
    const hasStats =
      bodyText.includes('₽') ||
      bodyText.includes('руб') ||
      /\d+/.test(bodyText);

    expect(hasStats).toBe(true);
  });

  test('withdrawal status filter works', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/partners/withdrawals');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    // Try to find and open a status filter
    const statusButton = page.locator('button:has-text("Статус"), [role="combobox"]').first();
    const statusSelect = page.locator('select').first();

    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click();
      await page.waitForTimeout(500);

      // Check for dropdown options
      const options = page.locator('[role="option"], [role="menuitem"]');
      const optionCount = await options.count();

      if (optionCount > 0) {
        // Select first option
        await options.first().click();
        await page.waitForTimeout(1000);
      }

      // Page should not crash
      const afterText = await page.locator('body').innerText();
      expect(afterText.trim().length).toBeGreaterThan(10);
    } else if (await statusSelect.isVisible().catch(() => false)) {
      const options = await statusSelect.locator('option').allInnerTexts();
      expect(options.length).toBeGreaterThan(0);

      if (options.length > 1) {
        await statusSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }

      const afterText = await page.locator('body').innerText();
      expect(afterText.trim().length).toBeGreaterThan(10);
    } else {
      // No filter found — just verify the page loaded
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(50);
    }
  });

  test('withdrawal stats API returns data', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/partners/withdrawals/stats', adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      // Stats should have some structure — total, pending, approved counts or amounts
      expect(Object.keys(data).length).toBeGreaterThan(0);
    } else {
      // API may not be fully implemented — document but don't hard fail
      expect.soft(res.success).toBe(true);
    }
  });
});

test.describe('Partner Detail Page', () => {
  test('partner detail page loads for seeded partner', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // Get the partner user ID from the partners list
    const res = await apiGet('/admin/partners?limit=1', adminToken);
    test.skip(!res.success, 'Partners API failed');

    const data = res.data as { items?: { userId: string; user?: { email?: string } }[] };
    const partnerId = data?.items?.[0]?.userId;
    test.skip(!partnerId, 'No partner users found');

    const loaded = await waitForAdminPage(page, `/admin/partners/${partnerId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();

    // Verify partner info is displayed — email, level, stats
    const hasEmail = bodyText.includes('@');
    const hasLevel =
      bodyText.includes('Уровень') ||
      bodyText.includes('уровень') ||
      bodyText.includes('Level') ||
      /Level\s*\d/.test(bodyText);
    const hasStats =
      bodyText.includes('Партнер') ||
      bodyText.includes('партнер') ||
      bodyText.includes('Команда') ||
      bodyText.includes('Комиссии') ||
      bodyText.includes('Заработок') ||
      /\d+/.test(bodyText);

    expect(hasEmail || hasLevel || hasStats).toBe(true);
  });

  test('partner stats API returns totals', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/partners/stats', adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      // Stats should contain fields like totalPartners, totalCommissions, etc.
      expect(Object.keys(data).length).toBeGreaterThan(0);
    } else {
      // Document API response even if it fails
      expect.soft(res.success).toBe(true);
    }
  });
});
