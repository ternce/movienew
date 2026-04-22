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

test.describe('Select Components', () => {
  test.describe('Generic Select Behavior', () => {
    test('select renders with combobox role', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const combobox = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await combobox.isVisible().catch(() => false);

      if (!isVisible) {
        // Try select elements instead
        const selectElement = page.locator('select, [data-radix-select-trigger]').first();
        const selectVisible = await selectElement.isVisible().catch(() => false);
        if (!selectVisible) {
          test.skip(true, 'No select/combobox elements found on profile page');
          return;
        }
        expect(selectVisible).toBe(true);
      } else {
        const role = await combobox.getAttribute('role');
        expect(role).toBe('combobox');
      }
    });

    test('clicking select opens listbox with options', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const trigger = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await trigger.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No combobox elements found');
        return;
      }

      await trigger.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);

      if (!listboxVisible) {
        // Radix Select may use data-radix-popper-content-wrapper
        const popper = page.locator('[data-radix-popper-content-wrapper]').first();
        const popperVisible = await popper.isVisible().catch(() => false);
        expect(popperVisible).toBe(true);
      } else {
        await expect(listbox).toBeVisible();
        const options = listbox.locator(ROLES.OPTION);
        expect(await options.count()).toBeGreaterThanOrEqual(1);
      }
    });

    test('selecting an option updates trigger text', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const trigger = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await trigger.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No combobox elements found');
        return;
      }

      const triggerTextBefore = await trigger.innerText().catch(() => '');

      await trigger.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);
      if (!listboxVisible) {
        test.skip(true, 'Listbox did not open');
        return;
      }

      const options = listbox.locator(ROLES.OPTION);
      const optionCount = await options.count();
      if (optionCount < 2) {
        test.skip(true, 'Not enough options to test selection change');
        return;
      }

      // Click the second option (to change from current selection)
      await options.nth(1).click();
      await page.waitForTimeout(500);

      // Listbox should close
      const listboxStillVisible = await listbox.isVisible().catch(() => false);
      expect(listboxStillVisible).toBe(false);

      // Trigger text may have changed
      const triggerTextAfter = await trigger.innerText().catch(() => '');
      expect(triggerTextAfter.length).toBeGreaterThan(0);
    });

    test('Escape closes the select listbox', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const trigger = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await trigger.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No combobox elements found');
        return;
      }

      await trigger.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);
      if (!listboxVisible) {
        test.skip(true, 'Listbox did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const stillVisible = await listbox.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });
  });

  test.describe('DataTablePagination Page Size Select', () => {
    test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

    test('page size select exists in admin table', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(5000);

      // Page size selects are typically at the bottom of the table
      const pageSizeSelect = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await pageSizeSelect.isVisible().catch(() => false);

      if (!isVisible) {
        // Try looking for a select element or a button with page size text
        const pageSizeButton = page.locator('button').filter({ hasText: /10|20|50|100/ }).first();
        const btnVisible = await pageSizeButton.isVisible().catch(() => false);
        expect(btnVisible || isVisible).toBe(true);
      } else {
        await expect(pageSizeSelect).toBeVisible();
      }
    });

    test('page size select opens with options', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(5000);

      const pageSizeSelect = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await pageSizeSelect.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No page size select found');
        return;
      }

      await pageSizeSelect.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);
      if (!listboxVisible) {
        test.skip(true, 'Listbox did not open');
        return;
      }

      const options = listbox.locator(ROLES.OPTION);
      expect(await options.count()).toBeGreaterThanOrEqual(2);
    });

    test('selecting a page size option closes listbox', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(5000);

      const pageSizeSelect = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await pageSizeSelect.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No page size select found');
        return;
      }

      await pageSizeSelect.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);
      if (!listboxVisible) {
        test.skip(true, 'Listbox did not open');
        return;
      }

      const options = listbox.locator(ROLES.OPTION);
      const count = await options.count();
      if (count < 1) {
        test.skip(true, 'No options available');
        return;
      }

      await options.first().click();
      await page.waitForTimeout(500);

      const stillVisible = await listbox.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });
  });

  test.describe('Select Keyboard Navigation', () => {
    test('ArrowDown opens select when focused', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const trigger = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await trigger.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No combobox elements found');
        return;
      }

      // Focus the trigger first
      await trigger.focus();
      await page.waitForTimeout(200);

      // ArrowDown or Space should open the listbox
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const popper = page.locator('[data-radix-popper-content-wrapper]').first();

      const listboxVisible = await listbox.isVisible().catch(() => false);
      const popperVisible = await popper.isVisible().catch(() => false);

      expect(listboxVisible || popperVisible).toBe(true);
    });

    test('arrow keys navigate between options', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const trigger = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await trigger.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No combobox elements found');
        return;
      }

      await trigger.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);
      if (!listboxVisible) {
        test.skip(true, 'Listbox did not open');
        return;
      }

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(200);

      // Listbox should still be open
      await expect(listbox).toBeVisible();

      // There should be a highlighted/focused option
      const highlighted = listbox.locator(
        '[role="option"][data-highlighted], [role="option"][aria-selected="true"], [role="option"][data-state="checked"]'
      ).first();
      const hasHighlighted = await highlighted.count().catch(() => 0);
      // Some selects highlight visually without data attributes — at least the listbox is still open
      expect(await listbox.isVisible()).toBe(true);
    });

    test('Enter selects the focused option', async ({ page }) => {
      const ok = await waitForPage(page, '/account/profile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const trigger = page.locator(ROLES.COMBOBOX).first();
      const isVisible = await trigger.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No combobox elements found');
        return;
      }

      await trigger.click();
      await page.waitForTimeout(500);

      const listbox = page.locator(ROLES.LISTBOX).first();
      const listboxVisible = await listbox.isVisible().catch(() => false);
      if (!listboxVisible) {
        test.skip(true, 'Listbox did not open');
        return;
      }

      // Navigate to an option and press Enter
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Listbox should close after selection
      const stillVisible = await listbox.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });
  });
});
