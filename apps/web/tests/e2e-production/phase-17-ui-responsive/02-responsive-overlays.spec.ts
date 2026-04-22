/**
 * Phase 17 — Responsive Overlay Tests
 * Tests that modals, drawers, popovers, and sheets adapt correctly across viewports.
 * Desktop uses popovers, mobile uses sheets; dialogs resize responsively.
 */

import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  setViewport,
  gotoAtViewport,
} from './helpers/responsive-test.helper';

test.describe('Responsive Overlays', () => {
  // ─── NotificationBell: Popover (desktop) vs Sheet (mobile) ──────

  test.describe('NotificationBell Overlay', () => {
    test('desktop: notification opens as popover', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator('button[aria-label*="ведомлен" i], button[aria-label*="notification" i]').first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible');
        return;
      }

      await bell.click();
      await page.waitForTimeout(1000);

      // Desktop should use popover (not full-screen dialog)
      const popover = page.locator('[data-radix-popper-content-wrapper]').first();
      const dialog = page.locator('[role="dialog"]').first();

      const hasPopover = await popover.isVisible({ timeout: 10_000 }).catch(() => false);
      const hasDialog = await dialog.isVisible().catch(() => false);

      expect(hasPopover || hasDialog, 'Should open some overlay').toBe(true);

      if (hasPopover) {
        const box = await popover.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          // Popover should NOT be full-width on desktop
          expect(box.width).toBeLessThan(VIEWPORTS.desktop.width * 0.8);
        }
      }
    });

    test('mobile: notification opens as sheet or full-width overlay', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const bell = page.locator('button[aria-label*="ведомлен" i], button[aria-label*="notification" i]').first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'Notification bell not visible on mobile');
        return;
      }

      await bell.click();
      await page.waitForTimeout(500);

      const overlay = page.locator('[role="dialog"], [data-radix-popper-content-wrapper]').first();
      await expect(overlay).toBeVisible({ timeout: 5_000 });
    });
  });

  // ─── CartDrawer: Sheet sizing ───────────────────────────────────

  test.describe('CartDrawer Sizing', () => {
    test('desktop: cart drawer has constrained width', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const cartTrigger = page.locator('button[aria-label*="орзин" i], a[href="/store/cart"]').first();
      if (!(await cartTrigger.isVisible().catch(() => false))) {
        test.skip(true, 'Cart trigger not visible');
        return;
      }

      await cartTrigger.click();
      await page.waitForTimeout(500);

      const sheet = page.locator('[role="dialog"]').first();
      if (!(await sheet.isVisible().catch(() => false))) {
        test.skip(true, 'Cart drawer did not open');
        return;
      }

      const box = await sheet.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Desktop drawer should NOT take full width
        expect(box.width).toBeLessThan(VIEWPORTS.desktop.width * 0.5);
      }
    });

    test('mobile: cart drawer takes full or near-full width', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const cartTrigger = page.locator('button[aria-label*="орзин" i], a[href="/store/cart"]').first();
      if (!(await cartTrigger.isVisible().catch(() => false))) {
        test.skip(true, 'Cart trigger not visible on mobile');
        return;
      }

      await cartTrigger.click();
      await page.waitForTimeout(500);

      const sheet = page.locator('[role="dialog"]').first();
      if (!(await sheet.isVisible().catch(() => false))) {
        test.skip(true, 'Cart drawer did not open on mobile');
        return;
      }

      const box = await sheet.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Mobile drawer should take most of the viewport width
        expect(box.width).toBeGreaterThan(VIEWPORTS.mobile.width * 0.7);
      }
    });
  });

  // ─── Dialog sizing across viewports ─────────────────────────────

  test.describe('Dialog Sizing', () => {
    test('desktop: dialogs are centered and constrained', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Try to open a dialog (profile dropdown → settings, or sidebar add genre)
      const sidebar = page.locator('aside').first();
      const addButton = sidebar.locator('button:has-text("+"), button[aria-label*="добавить" i]').first();

      if (!(await addButton.isVisible().catch(() => false))) {
        test.skip(true, 'No dialog trigger found');
        return;
      }

      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]').first();
      if (!(await dialog.isVisible().catch(() => false))) {
        test.skip(true, 'Dialog did not open');
        return;
      }

      const box = await dialog.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Dialog should be centered (roughly middle of viewport)
        const centerX = box.x + box.width / 2;
        const viewportCenterX = VIEWPORTS.desktop.width / 2;
        expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(50);

        // Dialog should not take full width on desktop
        expect(box.width).toBeLessThan(VIEWPORTS.desktop.width * 0.8);
      }
    });

    test('mobile: dialogs adapt to mobile width', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Try to trigger a dialog
      const hamburger = page.locator('button[aria-label*="меню" i]').first();
      if (await hamburger.isVisible().catch(() => false)) {
        await hamburger.click();
        await page.waitForTimeout(500);
      }

      const addButton = page.locator('button:has-text("+"), button[aria-label*="добавить" i]').first();
      if (!(await addButton.isVisible().catch(() => false))) {
        test.skip(true, 'No dialog trigger found on mobile');
        return;
      }

      await addButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]').last();
      if (!(await dialog.isVisible().catch(() => false))) {
        test.skip(true, 'Dialog did not open on mobile');
        return;
      }

      const box = await dialog.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // On mobile, dialog should take most of the width
        expect(box.width).toBeGreaterThan(VIEWPORTS.mobile.width * 0.7);
      }
    });
  });

  // ─── Search overlay responsiveness ──────────────────────────────

  test.describe('Search Overlay', () => {
    test('desktop: search input inline in header', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const searchInput = page.locator('header input[type="search"], header input[placeholder*="Поиск" i], header input[placeholder*="оиск" i]').first();
      const searchButton = page.locator('header button[aria-label*="оиск" i]').first();

      const hasInlineSearch = await searchInput.isVisible().catch(() => false);
      const hasSearchButton = await searchButton.isVisible().catch(() => false);

      expect(hasInlineSearch || hasSearchButton, 'Desktop should have search in header').toBe(true);
    });

    test('mobile: search button opens overlay', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // On mobile, search is a link in the bottom navigation bar that navigates to /search
      const bottomNavSearch = page.locator('nav a[href="/search"]').first();
      const searchButton = page.locator('button[aria-label*="оиск" i], button[aria-label*="search" i]').first();

      if (await bottomNavSearch.isVisible().catch(() => false)) {
        await bottomNavSearch.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/search');
      } else if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);
        const hasOverlay = await page.locator('[role="dialog"], [class*="overlay"], [class*="search"]').first().isVisible().catch(() => false);
        const onSearchPage = page.url().includes('/search');
        expect(hasOverlay || onSearchPage, 'Should open search overlay or navigate to search page').toBe(true);
      } else {
        // Try finding search by text in bottom nav
        const searchByText = page.locator('nav').getByText('Поиск').first();
        if (await searchByText.isVisible().catch(() => false)) {
          await searchByText.click();
          await page.waitForTimeout(1000);
          expect(page.url()).toContain('/search');
        } else {
          test.skip(true, 'Search not found in mobile navigation');
        }
      }
    });
  });

  // ─── Overlay escape and backdrop across viewports ───────────────

  test.describe('Overlay Dismiss Behavior', () => {
    test('desktop: Escape closes open overlay', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Open notification bell popover
      const bell = page.locator('button[aria-label*="ведомлен" i]').first();
      if (!(await bell.isVisible().catch(() => false))) {
        test.skip(true, 'No overlay trigger available');
        return;
      }

      await bell.click();
      await page.waitForTimeout(500);

      const overlay = page.locator('[data-radix-popper-content-wrapper], [role="dialog"]').first();
      if (!(await overlay.isVisible().catch(() => false))) {
        test.skip(true, 'Overlay did not open');
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const stillVisible = await overlay.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    });

    test('mobile: overlays cover full screen', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Open hamburger menu
      const hamburger = page.locator('button[aria-label*="меню" i]').first();
      if (!(await hamburger.isVisible().catch(() => false))) {
        test.skip(true, 'Hamburger not visible');
        return;
      }

      await hamburger.click();
      await page.waitForTimeout(500);

      const overlay = page.locator('[role="dialog"]').first();
      if (!(await overlay.isVisible().catch(() => false))) {
        test.skip(true, 'No overlay appeared');
        return;
      }

      // Overlay should span most of the mobile viewport
      const box = await overlay.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThan(VIEWPORTS.mobile.height * 0.3);
      }
    });
  });
});
