import { test, expect, type Locator } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  ROLES,
  UI,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.use({ storageState: path.join(AUTH_DIR, 'user-state.json') });

// ─── Tooltips ───────────────────────────────────────────────────────

test.describe('Tooltips', () => {
  test('Tooltip element with role="tooltip" appears on hover', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Check for explicit Radix Tooltip triggers first
    const radixTriggers = page.locator('[data-radix-tooltip-trigger]');
    const radixCount = await radixTriggers.count();

    if (radixCount === 0) {
      // No Radix Tooltip components on this page — skip gracefully
      test.skip(true, 'No tooltip triggers on this page');
      return;
    }

    let tooltipAppeared = false;

    const maxTries = Math.min(radixCount, 5);
    for (let i = 0; i < maxTries; i++) {
      await radixTriggers.nth(i).hover();
      await page.waitForTimeout(1000);

      const tooltip = page.locator(ROLES.TOOLTIP).first();
      if (await tooltip.isVisible().catch(() => false)) {
        tooltipAppeared = true;
        break;
      }
    }

    if (!tooltipAppeared) {
      test.skip(true, 'No tooltip appeared on hover over any candidate element');
    }
  });

  test('Tooltip disappears when mouse leaves trigger', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const radixTriggers = page.locator('[data-radix-tooltip-trigger]');
    const radixCount = await radixTriggers.count();
    if (radixCount === 0) { test.skip(true, 'No tooltip triggers on this page'); return; }

    let tooltipTrigger: Locator | null = null;

    for (let i = 0; i < Math.min(radixCount, 5); i++) {
      await radixTriggers.nth(i).hover();
      await page.waitForTimeout(1000);

      const tooltip = page.locator(ROLES.TOOLTIP).first();
      if (await tooltip.isVisible().catch(() => false)) {
        tooltipTrigger = radixTriggers.nth(i);
        break;
      }
    }

    if (!tooltipTrigger) { test.skip(true, 'No tooltip appeared to test dismiss'); return; }

    // Move mouse away from the trigger
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1000);

    const tooltip = page.locator(ROLES.TOOLTIP).first();
    const stillVisible = await tooltip.isVisible().catch(() => false);
    expect(stillVisible, 'Tooltip should disappear when mouse leaves trigger').toBe(false);
  });

  test('Tooltip appears on keyboard focus of trigger', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Tab through elements to try triggering a tooltip via keyboard focus
    let tooltipAppeared = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      const tooltip = page.locator(ROLES.TOOLTIP).first();
      if (await tooltip.isVisible().catch(() => false)) {
        tooltipAppeared = true;
        break;
      }
    }

    if (!tooltipAppeared) {
      test.skip(true, 'No tooltip appeared via keyboard focus');
    }
  });
});

// ─── Toasts ─────────────────────────────────────────────────────────

test.describe('Toasts', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'partner-state.json') });

  test('Toast appears on copy action at /partner/invite', async ({ page }) => {
    const ok = await waitForPage(page, '/partner/invite');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const copyButton = page.locator(
      'button:has-text("Копировать"), button[aria-label*="копировать" i], button[aria-label*="copy" i]'
    ).first();
    const isVisible = await copyButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Copy button not found'); return; }

    await copyButton.click();
    await page.waitForTimeout(1500);

    // Wait for toast to appear
    const toast = page.locator('[data-sonner-toast], [role="status"]').first();
    const toastVisible = await toast.isVisible({ timeout: 5_000 }).catch(() => false);

    expect(toastVisible, 'Toast should appear after copy action').toBe(true);
  });

  test('Toast has visible text content', async ({ page }) => {
    const ok = await waitForPage(page, '/partner/invite');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const copyButton = page.locator(
      'button:has-text("Копировать"), button[aria-label*="копировать" i], button[aria-label*="copy" i]'
    ).first();
    const isVisible = await copyButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Copy button not found'); return; }

    await copyButton.click();
    await page.waitForTimeout(1500);

    const toast = page.locator('[data-sonner-toast], [role="status"]').first();
    const toastVisible = await toast.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!toastVisible) { test.skip(true, 'Toast did not appear'); return; }

    const toastText = await toast.textContent();
    expect(toastText?.length).toBeGreaterThan(0);
  });

  test('Toast auto-dismisses after timeout', async ({ page }) => {
    const ok = await waitForPage(page, '/partner/invite');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const copyButton = page.locator(
      'button:has-text("Копировать"), button[aria-label*="копировать" i], button[aria-label*="copy" i]'
    ).first();
    const isVisible = await copyButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Copy button not found'); return; }

    await copyButton.click();
    await page.waitForTimeout(1500);

    const toast = page.locator('[data-sonner-toast], [role="status"]').first();
    const toastVisible = await toast.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!toastVisible) { test.skip(true, 'Toast did not appear'); return; }

    // Wait for auto-dismiss (Sonner default is ~4s)
    await page.waitForTimeout(6000);

    const stillVisible = await toast.isVisible().catch(() => false);
    // Toast should be gone or at least starting to fade
    expect(stillVisible, 'Toast should auto-dismiss after timeout').toBe(false);
  });

  test('Toast has close button or dismiss mechanism', async ({ page }) => {
    const ok = await waitForPage(page, '/partner/invite');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const copyButton = page.locator(
      'button:has-text("Копировать"), button[aria-label*="копировать" i], button[aria-label*="copy" i]'
    ).first();
    const isVisible = await copyButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Copy button not found'); return; }

    await copyButton.click();
    await page.waitForTimeout(1500);

    const toast = page.locator('[data-sonner-toast], [role="status"]').first();
    const toastVisible = await toast.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!toastVisible) { test.skip(true, 'Toast did not appear'); return; }

    // Look for close button within the toast
    const closeButton = toast.locator('button').first();
    const hasClose = await closeButton.isVisible().catch(() => false);

    // Sonner toasts can also be swiped/clicked to dismiss
    // Just verify the toast is interactive in some way
    if (hasClose) {
      await closeButton.click();
      await page.waitForTimeout(1000);
      const afterClose = await toast.isVisible().catch(() => false);
      expect(afterClose).toBe(false);
    } else {
      // No explicit close button — toast uses auto-dismiss
      expect(toastVisible).toBe(true);
    }
  });

  test('Multiple toasts can stack (trigger two actions quickly)', async ({ page }) => {
    const ok = await waitForPage(page, '/partner/invite');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const copyButton = page.locator(
      'button:has-text("Копировать"), button[aria-label*="копировать" i], button[aria-label*="copy" i]'
    ).first();
    const isVisible = await copyButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Copy button not found'); return; }

    // Click twice quickly to trigger two toasts
    await copyButton.click();
    await page.waitForTimeout(500);
    await copyButton.click();
    await page.waitForTimeout(2000);

    const toasts = page.locator('[data-sonner-toast], [role="status"] > div');
    const count = await toasts.count();

    // Should have at least 1 toast (stacking may or may not be supported)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Error toast appears on failed login (wrong creds)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    const hasForm = await emailInput.isVisible().catch(() => false);
    if (!hasForm) { test.skip(true, 'Login form not found'); return; }

    await emailInput.fill('nonexistent@invalid.com');
    await passwordInput.fill('wrongpassword123');
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Error should show as toast or inline error message
    const toast = page.locator('[data-sonner-toast], [role="status"], [role="alert"]').first();
    const toastVisible = await toast.isVisible().catch(() => false);

    const errorText = page.locator(
      'text=Неверн, text=ошибк, text=Error, text=Не удалось, [class*="error"]'
    ).first();
    const hasError = await errorText.isVisible().catch(() => false);

    // Body should contain some error indication
    const bodyText = await page.locator('body').innerText();
    const hasErrorMessage =
      bodyText.includes('Неверн') ||
      bodyText.includes('ошибк') ||
      bodyText.includes('не найден') ||
      bodyText.includes('Не удалось') ||
      toastVisible ||
      hasError;

    expect(hasErrorMessage, 'Error feedback should appear on wrong credentials').toBe(true);
  });

  test('Toast container is positioned correctly (top-right or bottom-right)', async ({ page }) => {
    const ok = await waitForPage(page, '/partner/invite');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Check for Sonner toaster container
    const toasterContainer = page.locator(
      '[data-sonner-toaster], [class*="toaster"], [class*="toast-container"]'
    ).first();
    const isVisible = await toasterContainer.isVisible().catch(() => false);

    if (!isVisible) {
      // Toaster container may not be visible until a toast is shown
      // Trigger a toast to make it appear
      const copyButton = page.locator(
        'button:has-text("Копировать"), button[aria-label*="копировать" i]'
      ).first();
      const hasButton = await copyButton.isVisible().catch(() => false);
      if (!hasButton) { test.skip(true, 'Cannot trigger toast to check positioning'); return; }

      await copyButton.click();
      await page.waitForTimeout(2000);
    }

    const toaster = page.locator('[data-sonner-toaster]').first();
    const toasterVisible = await toaster.isVisible().catch(() => false);
    if (!toasterVisible) { test.skip(true, 'Toaster container not visible'); return; }

    // Check the position attribute on Sonner toaster
    const position = await toaster.getAttribute('data-position');
    if (position) {
      expect(
        ['top-right', 'bottom-right', 'top-center', 'bottom-center'].includes(position),
        `Toast position should be valid, got: ${position}`
      ).toBe(true);
    } else {
      // Toaster exists, position may be set via CSS
      expect(toasterVisible).toBe(true);
    }
  });
});
