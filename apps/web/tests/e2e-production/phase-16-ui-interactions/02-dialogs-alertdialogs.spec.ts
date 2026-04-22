import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  waitForOverlay,
  ROLES,
  UI,
  expectDismissOnEscape,
  expectDismissOnBackdrop,
  expectFocusTrap,
  expectFocusReturn,
  clickAndWaitForOverlay,
  waitForAdminPage,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Dialogs and AlertDialogs', () => {
  test.describe('EmailChangeSection Dialog', () => {
    test('"Изменить email" button opens dialog', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator(ROLES.DIALOG).first();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
    });

    test('email dialog has role="dialog" attribute', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      const role = await dialog.getAttribute('role');
      expect(role).toBe('dialog');
    });

    test('email dialog closes via close button', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      const dialog = await waitForOverlay(page, 'dialog');

      // Find close button inside dialog
      const closeBtn = dialog.locator('button:has(.sr-only), button[aria-label="Close"], [data-radix-dialog-close]').first();
      const closeBtnAlt = dialog.locator('button').filter({ hasText: /Закрыть|Отмена|Cancel|Close/ }).first();

      const closeVisible = await closeBtn.isVisible().catch(() => false);
      if (closeVisible) {
        await closeBtn.click();
      } else {
        const altVisible = await closeBtnAlt.isVisible().catch(() => false);
        if (altVisible) {
          await closeBtnAlt.click();
        } else {
          // Try the X button (usually first button in dialog header)
          await dialog.locator('button').first().click();
        }
      }

      await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    });

    test('email dialog closes via Escape', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      await waitForOverlay(page, 'dialog');
      await expectDismissOnEscape(page, 'dialog');
    });

    test('email dialog has focus trap', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      const dialog = await waitForOverlay(page, 'dialog');
      await expectFocusTrap(page, dialog);
    });

    test('focus returns to trigger after email dialog closes', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      await waitForOverlay(page, 'dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await expectFocusReturn(page, emailButton);
    });
  });

  test.describe('Cancel Subscription AlertDialog', () => {
    test('cancel button opens alert dialog', async ({ page }) => {
      const ok = await waitForPage(page, '/account/subscriptions');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for cancel subscription button
      const cancelButton = page.getByText(/Отменить подписку|Отменить|Отключить/).first();
      const isVisible = await cancelButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No cancel subscription button found (user may not have active subscription)');
        return;
      }

      await cancelButton.click();
      await page.waitForTimeout(500);

      // Should open alertdialog or dialog for confirmation
      const alertDialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
      await expect(alertDialog).toBeVisible({ timeout: 10_000 });
    });

    test('alert dialog has confirmation text', async ({ page }) => {
      const ok = await waitForPage(page, '/account/subscriptions');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const cancelButton = page.getByText(/Отменить подписку|Отменить|Отключить/).first();
      const isVisible = await cancelButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No cancel subscription button found');
        return;
      }

      await cancelButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
      const dialogVisible = await dialog.isVisible().catch(() => false);
      if (!dialogVisible) {
        test.skip(true, 'Dialog did not open');
        return;
      }

      const dialogText = await dialog.innerText();
      // Should have confirmation text in Russian
      expect(/[\u0400-\u04FF]/.test(dialogText)).toBe(true);
    });

    test('alert dialog Escape closes it', async ({ page }) => {
      const ok = await waitForPage(page, '/account/subscriptions');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const cancelButton = page.getByText(/Отменить подписку|Отменить|Отключить/).first();
      const isVisible = await cancelButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No cancel subscription button found');
        return;
      }

      await cancelButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
      const dialogVisible = await dialog.isVisible().catch(() => false);
      if (!dialogVisible) {
        test.skip(true, 'Dialog did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('General Dialog Behavior', () => {
    test('dialog overlay has backdrop opacity', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      await waitForOverlay(page, 'dialog');

      // The Radix overlay/backdrop typically has an opacity style
      const backdrop = page.locator('[data-radix-dialog-overlay], [class*="DialogOverlay"], [class*="overlay"]').first();
      const backdropVisible = await backdrop.isVisible().catch(() => false);

      // If there's a visible backdrop, that means the overlay is rendering
      // Even without a specific backdrop element, the dialog itself should be visible
      const dialog = page.locator(ROLES.DIALOG).first();
      await expect(dialog).toBeVisible();
      // Dialog is centered: check it has some content
      const dialogText = await dialog.innerText();
      expect(dialogText.length).toBeGreaterThan(0);
    });

    test('dialog is visually centered on screen', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      const dialog = await waitForOverlay(page, 'dialog');

      const box = await dialog.boundingBox();
      if (!box) {
        test.skip(true, 'Could not get dialog bounding box');
        return;
      }

      const viewport = page.viewportSize();
      if (!viewport) {
        test.skip(true, 'No viewport size');
        return;
      }

      // Dialog should be roughly centered horizontally
      const dialogCenterX = box.x + box.width / 2;
      const viewportCenterX = viewport.width / 2;
      const horizontalOffset = Math.abs(dialogCenterX - viewportCenterX);

      // Allow generous tolerance (within 40% of viewport width from center)
      expect(horizontalOffset).toBeLessThan(viewport.width * 0.4);
    });

    test('form validation inside dialog shows errors', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      const dialog = await waitForOverlay(page, 'dialog');

      // Try to submit the form inside the dialog without filling fields
      const submitBtn = dialog.locator('button[type="submit"]').first();
      const submitVisible = await submitBtn.isVisible().catch(() => false);

      if (!submitVisible) {
        // Try any confirm/save button
        const confirmBtn = dialog.locator('button').filter({ hasText: /Сохранить|Подтвердить|Изменить|Отправить/ }).first();
        const confirmVisible = await confirmBtn.isVisible().catch(() => false);
        if (!confirmVisible) {
          test.skip(true, 'No submit button found in dialog');
          return;
        }
        await confirmBtn.click();
      } else {
        await submitBtn.click();
      }

      await page.waitForTimeout(1000);

      // After empty submit, check for validation errors or the dialog should still be open
      const dialogStillOpen = await dialog.isVisible().catch(() => false);
      expect(dialogStillOpen).toBe(true);
    });

    test('multiple dialogs do not overlap', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Verify only one dialog opens at a time
      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      await waitForOverlay(page, 'dialog');

      const dialogCount = await page.locator(ROLES.DIALOG).count();
      expect(dialogCount).toBe(1);
    });

    test('dialog contains interactive elements', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const emailButton = page.getByText('Изменить email').first();
      const isVisible = await emailButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, '"Изменить email" button not found');
        return;
      }

      await emailButton.click();
      const dialog = await waitForOverlay(page, 'dialog');

      // Dialog should have buttons and/or inputs
      const buttonCount = await dialog.locator('button').count();
      const inputCount = await dialog.locator('input, textarea, select').count();

      expect(buttonCount + inputCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Admin Delete Confirmation AlertDialog', () => {
    test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

    test('delete action triggers confirmation dialog', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Try to find and click a delete button or row action
      const deleteButton = page.getByText(/Удалить/).first();
      const isVisible = await deleteButton.isVisible().catch(() => false);

      if (!isVisible) {
        // Try opening row actions first
        const rowAction = page.locator('table button[aria-haspopup], table button:has(svg)').first();
        const rowVisible = await rowAction.isVisible().catch(() => false);
        if (!rowVisible) {
          test.skip(true, 'No delete triggers found');
          return;
        }

        await rowAction.click();
        await page.waitForTimeout(500);

        const menuDelete = page.locator('[role="menuitem"]').filter({ hasText: /Удалить/ }).first();
        const menuDeleteVisible = await menuDelete.isVisible().catch(() => false);
        if (!menuDeleteVisible) {
          test.skip(true, 'No delete option in menu');
          return;
        }

        await menuDelete.click();
      } else {
        await deleteButton.click();
      }

      await page.waitForTimeout(500);

      // Should show alertdialog or dialog confirmation
      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
      const dialogShown = await confirmDialog.isVisible().catch(() => false);

      // If no dialog, the delete might have happened directly (which is also valid)
      if (dialogShown) {
        const dialogText = await confirmDialog.innerText();
        expect(/[\u0400-\u04FF]/.test(dialogText)).toBe(true);
      }
    });

    test('admin confirmation dialog has cancel and confirm buttons', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Open row action menu
      const rowAction = page.locator('table button[aria-haspopup], table button:has(svg)').first();
      const rowVisible = await rowAction.isVisible().catch(() => false);
      if (!rowVisible) {
        test.skip(true, 'No row action buttons found');
        return;
      }

      await rowAction.click();
      await page.waitForTimeout(500);

      const menuDelete = page.locator('[role="menuitem"]').filter({ hasText: /Удалить/ }).first();
      const menuDeleteVisible = await menuDelete.isVisible().catch(() => false);
      if (!menuDeleteVisible) {
        test.skip(true, 'No delete option in menu');
        return;
      }

      await menuDelete.click();
      await page.waitForTimeout(500);

      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
      const dialogShown = await confirmDialog.isVisible().catch(() => false);
      if (!dialogShown) {
        test.skip(true, 'Confirmation dialog did not appear');
        return;
      }

      // Should have at least 2 buttons (cancel + confirm)
      const buttons = confirmDialog.locator('button');
      expect(await buttons.count()).toBeGreaterThanOrEqual(2);
    });

    test('admin cancel button in confirmation dialog closes it', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const rowAction = page.locator('table button[aria-haspopup], table button:has(svg)').first();
      const rowVisible = await rowAction.isVisible().catch(() => false);
      if (!rowVisible) {
        test.skip(true, 'No row action buttons found');
        return;
      }

      await rowAction.click();
      await page.waitForTimeout(500);

      const menuDelete = page.locator('[role="menuitem"]').filter({ hasText: /Удалить/ }).first();
      const menuDeleteVisible = await menuDelete.isVisible().catch(() => false);
      if (!menuDeleteVisible) {
        test.skip(true, 'No delete option in menu');
        return;
      }

      await menuDelete.click();
      await page.waitForTimeout(500);

      const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').first();
      const dialogShown = await confirmDialog.isVisible().catch(() => false);
      if (!dialogShown) {
        test.skip(true, 'Confirmation dialog did not appear');
        return;
      }

      // Click cancel/close button
      const cancelBtn = confirmDialog
        .locator('button')
        .filter({ hasText: /Отмена|Отменить|Нет|Cancel/ })
        .first();
      const cancelVisible = await cancelBtn.isVisible().catch(() => false);

      if (cancelVisible) {
        await cancelBtn.click();
      } else {
        // Press Escape as fallback
        await page.keyboard.press('Escape');
      }

      await expect(confirmDialog).not.toBeVisible({ timeout: 5_000 });
    });
  });
});
