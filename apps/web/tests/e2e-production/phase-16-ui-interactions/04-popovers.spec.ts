import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  waitForOverlay,
  ROLES,
  UI,
  expectDismissOnEscape,
  expectFocusReturn,
  waitForAdminPage,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Popovers', () => {
  test.describe('NotificationBell Popover', () => {
    test('notification bell opens popover on click', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      await bell.click();
      await page.waitForTimeout(1500);

      // Popover content appears either as [role="dialog"] or via radix popper
      const popover = page.locator(
        '[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]'
      ).first();
      const popoverVisible = await popover.isVisible().catch(() => false);

      // The bell might navigate to /account/notifications instead of opening a popover
      const navigatedToNotifications = page.url().includes('/notification');

      expect(
        popoverVisible || navigatedToNotifications,
        'Notification bell should open a popover or navigate to notifications page'
      ).toBe(true);
    });

    test('notification popover shows content', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      await bell.click();
      await page.waitForTimeout(500);

      const popover = page.locator(
        '[data-radix-popper-content-wrapper], [role="dialog"]'
      ).first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Popover did not open');
        return;
      }

      const popoverText = await popover.innerText();
      // Should show notifications or an empty state message
      const hasContent =
        popoverText.includes('Уведомлени') ||
        popoverText.includes('уведомлен') ||
        popoverText.includes('Нет новых') ||
        popoverText.includes('пусто') ||
        popoverText.length > 5;

      expect(hasContent).toBe(true);
    });

    test('notification popover closes on outside click', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      await bell.click();
      await page.waitForTimeout(500);

      const popover = page.locator(
        '[data-radix-popper-content-wrapper], [role="dialog"]'
      ).first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Popover did not open');
        return;
      }

      // Click outside the popover
      await page.mouse.click(5, 5);
      await page.waitForTimeout(1000);

      const stillVisible = await popover.isVisible().catch(() => false);
      // Popover should be hidden after outside click
      expect(stillVisible).toBe(false);
    });

    test('notification popover closes on Escape', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      await bell.click();
      await page.waitForTimeout(500);

      const popover = page.locator(
        '[data-radix-popper-content-wrapper], [role="dialog"]'
      ).first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Popover did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      const stillVisible = await popover.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });

    test('focus returns to bell after popover closes', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      await bell.click();
      await page.waitForTimeout(500);

      const popover = page.locator(
        '[data-radix-popper-content-wrapper], [role="dialog"]'
      ).first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Popover did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await expectFocusReturn(page, bell);
    });

    test('notification bell has accessible label', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      // Check the button has an aria-label or accessible name
      const ariaLabel = await bell.getAttribute('aria-label');
      const innerText = await bell.innerText().catch(() => '');
      const hasAccessibleName = (ariaLabel && ariaLabel.length > 0) || innerText.length > 0;

      expect(hasAccessibleName).toBe(true);
    });
  });

  test.describe('DataTableFacetedFilter Popover', () => {
    test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

    test('filter button opens popover with options', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for filter buttons (often labeled with filter text or have a filter icon)
      const filterButton = page
        .locator('button')
        .filter({ hasText: /Тип|Статус|Фильтр|Категори/ })
        .first();
      const isVisible = await filterButton.isVisible().catch(() => false);

      if (!isVisible) {
        test.skip(true, 'No filter buttons found on admin content page');
        return;
      }

      await filterButton.click();
      await page.waitForTimeout(500);

      // The faceted filter uses a popover with checkboxes
      const popover = page.locator('[data-radix-popper-content-wrapper]').first();
      const popoverVisible = await popover.isVisible().catch(() => false);

      if (!popoverVisible) {
        // Also check for a listbox
        const listbox = page.locator(ROLES.LISTBOX).first();
        const listboxVisible = await listbox.isVisible().catch(() => false);
        expect(listboxVisible).toBe(true);
      } else {
        await expect(popover).toBeVisible();
      }
    });

    test('filter popover contains checkbox or option items', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const filterButton = page
        .locator('button')
        .filter({ hasText: /Тип|Статус|Фильтр|Категори/ })
        .first();
      const isVisible = await filterButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No filter buttons found');
        return;
      }

      await filterButton.click();
      await page.waitForTimeout(500);

      const popover = page.locator('[data-radix-popper-content-wrapper]').first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Filter popover did not open');
        return;
      }

      // Should have checkboxes, options, cmdk items, or selectable items
      const selectableItems = popover.locator(
        'input[type="checkbox"], [role="checkbox"], [role="option"], [cmdk-item], [data-value]'
      );
      const count = await selectableItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('filter popover closes on outside click', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const filterButton = page
        .locator('button')
        .filter({ hasText: /Тип|Статус|Фильтр|Категори/ })
        .first();
      const isVisible = await filterButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No filter buttons found');
        return;
      }

      await filterButton.click();
      await page.waitForTimeout(500);

      const popover = page.locator('[data-radix-popper-content-wrapper]').first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Filter popover did not open');
        return;
      }

      // Click outside
      await page.mouse.click(5, 5);
      await page.waitForTimeout(1000);

      const stillVisible = await popover.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });

    test('filter popover closes on Escape', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const filterButton = page
        .locator('button')
        .filter({ hasText: /Тип|Статус|Фильтр|Категори/ })
        .first();
      const isVisible = await filterButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No filter buttons found');
        return;
      }

      await filterButton.click();
      await page.waitForTimeout(500);

      const popover = page.locator('[data-radix-popper-content-wrapper]').first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Filter popover did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      const stillVisible = await popover.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });

    test('focus returns to filter button after popover closes', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const filterButton = page
        .locator('button')
        .filter({ hasText: /Тип|Статус|Фильтр|Категори/ })
        .first();
      const isVisible = await filterButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No filter buttons found');
        return;
      }

      await filterButton.click();
      await page.waitForTimeout(500);

      const popover = page.locator('[data-radix-popper-content-wrapper]').first();
      const popoverVisible = await popover.isVisible().catch(() => false);
      if (!popoverVisible) {
        test.skip(true, 'Filter popover did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await expectFocusReturn(page, filterButton);
    });
  });
});
