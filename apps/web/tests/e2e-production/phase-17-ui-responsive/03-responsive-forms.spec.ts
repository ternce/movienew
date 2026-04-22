/**
 * Phase 17 — Responsive Form Tests
 * Tests form layout, touch targets, and input behavior across viewports.
 */

import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  gotoAtViewport,
  expectTouchTarget,
  expectMinFontSize,
} from './helpers/responsive-test.helper';

test.describe('Responsive Forms', () => {
  // ─── Login Form ─────────────────────────────────────────────────

  test.describe('Login Form', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('desktop: login form is centered with constrained width', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      const box = await form.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Form should not span full desktop width
        expect(box.width).toBeLessThan(VIEWPORTS.desktop.width * 0.6);
        // Form should be roughly centered
        const centerX = box.x + box.width / 2;
        expect(Math.abs(centerX - VIEWPORTS.desktop.width / 2)).toBeLessThan(100);
      }
    });

    test('mobile: login form adapts to mobile width', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      const box = await form.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Form should use most of the mobile width
        expect(box.width).toBeGreaterThan(VIEWPORTS.mobile.width * 0.7);
      }
    });

    test('mobile: input fields have font-size >= 16px (no iOS zoom)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await expectMinFontSize(emailInput, 16);
      }
    });

    test('mobile: submit button is full-width or adequately sized', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();

      const box = await submitButton.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Button should be at least 70% of viewport width or have adequate touch target
        const isFullWidth = box.width > VIEWPORTS.mobile.width * 0.7;
        const isAdequateSize = box.width >= 200 && box.height >= 44;
        expect(isFullWidth || isAdequateSize, 'Submit button should be adequately sized on mobile').toBe(true);
      }
    });

    test('mobile: inputs have adequate touch target height', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const inputs = page.locator('input:visible');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i);
        const box = await input.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
      }
    });
  });

  // ─── Profile Form ──────────────────────────────────────────────

  test.describe('Profile Form', () => {
    test('desktop: profile form fields may be side-by-side', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/account/profile', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const form = page.locator('form').first();
      if (!(await form.isVisible().catch(() => false))) {
        test.skip(true, 'Profile form not visible');
        return;
      }

      // Just verify form renders at desktop width
      const box = await form.boundingBox();
      expect(box).toBeTruthy();
    });

    test('mobile: profile form fields stack vertically', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/account/profile', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const form = page.locator('form').first();
      if (!(await form.isVisible().catch(() => false))) {
        test.skip(true, 'Profile form not visible');
        return;
      }

      // Check that inputs are stacked (each on its own line)
      const inputs = form.locator('input:visible');
      const count = await inputs.count();
      if (count < 2) {
        test.skip(true, 'Not enough fields to check stacking');
        return;
      }

      const box1 = await inputs.nth(0).boundingBox();
      const box2 = await inputs.nth(1).boundingBox();

      if (box1 && box2) {
        // Vertically stacked means second input is below first
        expect(box2.y).toBeGreaterThan(box1.y);
        // Both should use similar width (stacked, not side-by-side)
        const widthDiff = Math.abs(box1.width - box2.width);
        expect(widthDiff).toBeLessThan(100);
      }
    });
  });

  // ─── Settings Form ─────────────────────────────────────────────

  test.describe('Settings Form', () => {
    test('mobile: toggle switches have adequate touch targets', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/account/settings', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const switches = page.locator('[role="switch"]');
      const count = await switches.count();

      if (count === 0) {
        test.skip(true, 'No switches on settings page');
        return;
      }

      // Each switch should be at least 36px in one dimension
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expectTouchTarget(switches.nth(i), 36);
      }
    });

    test('tablet: settings page renders without overflow', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/account/settings', 'tablet');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Check no horizontal scrollbar
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    });
  });

  // ─── Error Messages ────────────────────────────────────────────

  test.describe('Form Error Visibility', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('mobile: form errors are visible without truncation', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Submit empty form to trigger validation errors
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for error messages
      const errors = page.locator('[class*="error"], [class*="destructive"], [aria-invalid="true"], p[class*="text-red"], p[class*="text-destructive"]');
      const count = await errors.count();

      if (count === 0) {
        // Some forms use HTML5 validation instead
        return;
      }

      // Each error should be visible and not truncated
      for (let i = 0; i < Math.min(count, 3); i++) {
        const error = errors.nth(i);
        if (await error.isVisible().catch(() => false)) {
          const box = await error.boundingBox();
          expect(box).toBeTruthy();
          if (box) {
            // Error text should not be cut off (width should be reasonable)
            expect(box.width).toBeGreaterThan(50);
          }
        }
      }
    });
  });
});
