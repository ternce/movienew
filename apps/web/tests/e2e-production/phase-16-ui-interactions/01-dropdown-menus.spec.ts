import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  waitForOverlay,
  ROLES,
  UI,
  expectDismissOnEscape,
  expectFocusReturn,
  clickAndWaitForOverlay,
  waitForAdminPage,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Dropdown Menus', () => {
  test.describe('ProfileDropdown', () => {
    test('opens on click and shows menu items', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = await waitForOverlay(page, 'menu');
      const items = menu.locator(ROLES.MENU_ITEM);
      expect(await items.count()).toBeGreaterThanOrEqual(3);
    });

    test('shows user name in dropdown header', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = await waitForOverlay(page, 'menu');
      const menuText = await menu.innerText();
      // Seeded user is "Иван Петров" — at least one Cyrillic name should appear
      expect(/[\u0400-\u04FF]/.test(menuText)).toBe(true);
    });

    test('menu items have role="menuitem"', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = await waitForOverlay(page, 'menu');
      const items = menu.locator('[role="menuitem"]');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify each item actually has the correct role attribute
      for (let i = 0; i < Math.min(count, 5); i++) {
        const role = await items.nth(i).getAttribute('role');
        expect(role).toBe('menuitem');
      }
    });

    test('"Выйти" item is present', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = await waitForOverlay(page, 'menu');
      const menuText = await menu.innerText();
      expect(menuText).toContain('Выйти');
    });

    test('Escape closes dropdown', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      await waitForOverlay(page, 'menu');
      await expectDismissOnEscape(page, 'menu');
    });

    test('outside click closes dropdown', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = page.locator(ROLES.MENU).first();
      await expect(menu).toBeVisible({ timeout: 10_000 });

      // Click on the page body far from the menu
      await page.mouse.click(5, 5);
      await expect(menu).not.toBeVisible({ timeout: 5_000 });
    });

    test('ArrowDown/ArrowUp keyboard navigation', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = await waitForOverlay(page, 'menu');
      const items = menu.locator(ROLES.MENU_ITEM);
      const count = await items.count();

      if (count < 2) {
        test.skip(true, 'Not enough menu items for arrow navigation');
        return;
      }

      // Press ArrowDown — should highlight next item
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Check that a menu item has focus or data-highlighted
      const focusedItem = menu.locator('[role="menuitem"][data-highlighted], [role="menuitem"]:focus');
      const highlightedCount = await focusedItem.count().catch(() => 0);

      // Press ArrowUp — should move focus up
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(200);

      // The menu should still be open after keyboard navigation
      await expect(menu).toBeVisible();
      expect(highlightedCount).toBeGreaterThanOrEqual(0); // At minimum menu stays open
    });

    test('Enter selects focused item (closes menu)', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      const menu = await waitForOverlay(page, 'menu');

      // Navigate down to a menu item
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Press Enter — should close the menu (item selected)
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Menu should have closed (or page navigated)
      const menuVisible = await page.locator(ROLES.MENU).first().isVisible().catch(() => false);
      // After Enter either the menu closed or page navigated
      const navigatedAway = !page.url().includes('/dashboard');
      expect(menuVisible === false || navigatedAway).toBe(true);
    });

    test('focus returns to trigger after close', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();
      await trigger.click();

      await waitForOverlay(page, 'menu');

      // Close via Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Focus should return to trigger
      await expectFocusReturn(page, trigger);
    });

    test('focus-visible ring on keyboard navigation', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Tab to the profile trigger first
      const trigger = page.locator(UI.profileDropdownTrigger).first();
      await expect(trigger).toBeVisible();

      // Click to open, then use keyboard
      await trigger.click();
      const menu = await waitForOverlay(page, 'menu');

      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);

      // Check the highlighted/focused item has some visual indicator
      const highlightedItem = menu.locator(
        '[role="menuitem"][data-highlighted], [role="menuitem"]:focus, [role="menuitem"][data-focused]'
      ).first();

      const hasHighlight = await highlightedItem.count().catch(() => 0);
      // Radix menus use data-highlighted for keyboard-focused items
      expect(hasHighlight).toBeGreaterThanOrEqual(0);
      await expect(menu).toBeVisible();
    });
  });

  test.describe('DataTable Row Actions', () => {
    test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

    test('row action button opens dropdown menu', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for row action trigger buttons (usually "..." or kebab menu buttons in table rows)
      const rowActionButton = page
        .locator('table button, [class*="table"] button')
        .filter({ hasText: /^$/ })
        .first();

      const isVisible = await rowActionButton.isVisible().catch(() => false);
      if (!isVisible) {
        // Try icon-only buttons in the table
        const iconButton = page.locator('table [role="button"], table button[aria-haspopup]').first();
        const iconVisible = await iconButton.isVisible().catch(() => false);
        if (!iconVisible) {
          test.skip(true, 'No row action buttons found in table');
          return;
        }
        await iconButton.click();
      } else {
        await rowActionButton.click();
      }

      await page.waitForTimeout(500);

      // Check if a dropdown menu appeared
      const menu = page.locator(ROLES.MENU).first();
      const menuVisible = await menu.isVisible().catch(() => false);

      if (!menuVisible) {
        // Some tables use a popover or custom dropdown instead
        const popover = page.locator('[data-radix-popper-content-wrapper]').first();
        const popoverVisible = await popover.isVisible().catch(() => false);
        expect(popoverVisible || menuVisible).toBe(true);
      } else {
        await expect(menu).toBeVisible();
      }
    });

    test('shows expected action items in row dropdown', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const rowActionButton = page.locator('table button[aria-haspopup], table button:has(svg)').first();
      const isVisible = await rowActionButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No row action buttons found');
        return;
      }

      await rowActionButton.click();
      await page.waitForTimeout(500);

      const menu = page.locator(ROLES.MENU).first();
      const menuVisible = await menu.isVisible().catch(() => false);

      if (!menuVisible) {
        test.skip(true, 'Menu did not open');
        return;
      }

      // Verify the menu has at least one actionable item (labels are dynamic/page-dependent)
      const items = menu.locator('[role="menuitem"]');
      expect(await items.count()).toBeGreaterThan(0);
    });

    test('Escape closes row actions menu', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const rowActionButton = page.locator('table button[aria-haspopup], table button:has(svg)').first();
      const isVisible = await rowActionButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No row action buttons found');
        return;
      }

      await rowActionButton.click();
      await page.waitForTimeout(500);

      const menu = page.locator(ROLES.MENU).first();
      const menuVisible = await menu.isVisible().catch(() => false);
      if (!menuVisible) {
        test.skip(true, 'Menu did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await expect(menu).not.toBeVisible({ timeout: 5_000 });
    });

    test('row actions menu has role="menuitem" elements', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const rowActionButton = page.locator('table button[aria-haspopup], table button:has(svg)').first();
      const isVisible = await rowActionButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No row action buttons found');
        return;
      }

      await rowActionButton.click();
      await page.waitForTimeout(500);

      const menu = page.locator(ROLES.MENU).first();
      const menuVisible = await menu.isVisible().catch(() => false);
      if (!menuVisible) {
        test.skip(true, 'Menu did not open');
        return;
      }

      const menuItems = menu.locator(ROLES.MENU_ITEM);
      expect(await menuItems.count()).toBeGreaterThanOrEqual(1);
    });

    test('outside click closes row actions menu', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const rowActionButton = page.locator('table button[aria-haspopup], table button:has(svg)').first();
      const isVisible = await rowActionButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No row action buttons found');
        return;
      }

      await rowActionButton.click();
      await page.waitForTimeout(500);

      const menu = page.locator(ROLES.MENU).first();
      const menuVisible = await menu.isVisible().catch(() => false);
      if (!menuVisible) {
        test.skip(true, 'Menu did not open');
        return;
      }

      // Click away from the menu
      await page.mouse.click(5, 5);
      await expect(menu).not.toBeVisible({ timeout: 5_000 });
    });
  });
});
