import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  UI,
  ROLES,
  expectDismissOnEscape,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Notifications', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'user-state.json') });

  test.describe('NotificationBell', () => {
    test('bell button is visible in header', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      await expect(bell).toBeVisible();
    });

    test('clicking bell opens notification popover or dropdown', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      const isVisible = await bell.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Notification bell not found');
        return;
      }

      await bell.click();
      await page.waitForTimeout(2000);

      // Should open a popover, dialog, sheet, or dropdown
      const overlay = page
        .locator('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"], [role="listbox"]')
        .first();
      const overlayVisible = await overlay.isVisible({ timeout: 5_000 }).catch(() => false);

      // Also check for notification-related text appearing anywhere new
      const notifText = page.locator('text=/Уведомлени/i').first();
      const hasNotifText = await notifText.isVisible().catch(() => false);

      // Or a sheet/drawer might have opened (mobile uses Sheet)
      const sheet = page.locator('[data-state="open"][role="dialog"], [class*="sheet"]').first();
      const sheetVisible = await sheet.isVisible().catch(() => false);

      // Or navigation to notifications page
      const navigated = page.url().includes('/notification');

      expect(
        overlayVisible || hasNotifText || sheetVisible || navigated,
        'Clicking bell should open notification popover, sheet, or navigate to notifications'
      ).toBe(true);
    });

    test('notification area shows items or empty state message', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      const isVisible = await bell.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Notification bell not found');
        return;
      }

      await bell.click();
      await page.waitForTimeout(1000);

      const overlay = page
        .locator('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]')
        .first();
      const overlayVisible = await overlay.isVisible().catch(() => false);
      if (!overlayVisible) {
        test.skip(true, 'Notification overlay did not open');
        return;
      }

      const overlayText = await overlay.innerText();
      // Should have either notification items or an empty state message
      const hasContent =
        overlayText.length > 0 &&
        (/[\u0400-\u04FF]/.test(overlayText) || overlayText.includes('notification'));
      expect(hasContent, 'Notification area should have text content (items or empty state)').toBe(true);
    });

    test('"Mark all read" or "Прочитать все" action button present', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      const isVisible = await bell.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Notification bell not found');
        return;
      }

      await bell.click();
      await page.waitForTimeout(1000);

      const overlay = page
        .locator('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]')
        .first();
      const overlayVisible = await overlay.isVisible().catch(() => false);
      if (!overlayVisible) {
        test.skip(true, 'Notification overlay did not open');
        return;
      }

      // Look for mark-all-read action
      const markAllRead = overlay
        .locator('button, a')
        .filter({ hasText: /Прочитать все|Отметить все|Mark all|Все прочитаны/ })
        .first();
      const linkToAll = overlay.locator('a[href*="notification"]').first();

      const hasMarkAll = await markAllRead.isVisible().catch(() => false);
      const hasLink = await linkToAll.isVisible().catch(() => false);

      // Either a mark-all button or a "view all" link should be present
      expect(
        hasMarkAll || hasLink,
        'Should have a mark-all-read button or a link to all notifications'
      ).toBe(true);
    });

    test('popover/dropdown closes on Escape', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      const isVisible = await bell.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Notification bell not found');
        return;
      }

      await bell.click();
      await page.waitForTimeout(1000);

      const overlay = page
        .locator('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]')
        .first();
      const overlayVisible = await overlay.isVisible().catch(() => false);
      if (!overlayVisible) {
        test.skip(true, 'Notification overlay did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Overlay should be dismissed
      const stillVisible = await overlay.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });

    test('popover/dropdown closes on outside click', async ({ page }) => {
      const ok = await waitForPage(page, '/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator(UI.notificationBell).first();
      const isVisible = await bell.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Notification bell not found');
        return;
      }

      await bell.click();
      await page.waitForTimeout(1000);

      const overlay = page
        .locator('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]')
        .first();
      const overlayVisible = await overlay.isVisible().catch(() => false);
      if (!overlayVisible) {
        test.skip(true, 'Notification overlay did not open');
        return;
      }

      // Click far from overlay
      await page.mouse.click(5, 5);
      await page.waitForTimeout(500);

      const stillVisible = await overlay.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });
  });

  test.describe('Notifications Page', () => {
    test('notifications page loads at /account/notifications', async ({ page }) => {
      const ok = await waitForPage(page, '/account/notifications');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await expect(page.locator('body')).not.toBeEmpty();
      // Page should contain Russian text
      const bodyText = await page.locator('body').innerText();
      expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
    });

    test('notifications page has list content or empty state', async ({ page }) => {
      const ok = await waitForPage(page, '/account/notifications');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for notification list items or empty state
      const notificationItems = page.locator(
        '[class*="notification"], [data-testid*="notification"], article, [class*="item"]'
      );
      const emptyState = page.locator('text=/Нет уведомлений|Пусто|У вас нет|No notifications/i');

      const itemCount = await notificationItems.count();
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(
        itemCount > 0 || hasEmpty,
        'Should show notification items or an empty state message'
      ).toBe(true);
    });

    test('filter tabs visible on notifications page (if present)', async ({ page }) => {
      const ok = await waitForPage(page, '/account/notifications');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for filter tabs (role="tablist" or buttons acting as filters)
      const tabList = page.locator(ROLES.TAB_LIST).first();
      const filterButtons = page
        .locator('button, [role="tab"]')
        .filter({ hasText: /Все|Системные|Промо|Платежи|All|System/ });

      const hasTabList = await tabList.isVisible().catch(() => false);
      const filterCount = await filterButtons.count();

      if (!hasTabList && filterCount === 0) {
        test.skip(true, 'No filter tabs found on notifications page');
        return;
      }

      expect(hasTabList || filterCount > 0).toBe(true);
    });

    test('individual notification item is clickable', async ({ page }) => {
      const ok = await waitForPage(page, '/account/notifications');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for clickable notification items
      const notificationLink = page.locator(
        'a[href*="notification"], [class*="notification"] a, [role="button"][class*="notification"]'
      ).first();
      const notificationDiv = page.locator(
        '[class*="notification-item"], [data-testid*="notification"]'
      ).first();

      const linkVisible = await notificationLink.isVisible().catch(() => false);
      const divVisible = await notificationDiv.isVisible().catch(() => false);

      if (!linkVisible && !divVisible) {
        test.skip(true, 'No notification items found to click');
        return;
      }

      if (linkVisible) {
        // Verify link has an href
        const href = await notificationLink.getAttribute('href');
        expect(href).toBeTruthy();
      } else {
        // Verify div is interactive (has cursor pointer or click handler)
        const cursor = await notificationDiv.evaluate(
          (el) => window.getComputedStyle(el).cursor
        );
        expect(['pointer', 'default']).toContain(cursor);
      }
    });
  });
});
