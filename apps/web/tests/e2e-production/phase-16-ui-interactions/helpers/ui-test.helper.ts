/**
 * Shared helpers for Phase 16 — UI Interaction tests.
 * Provides Radix UI locator constants, overlay wait/dismiss utilities,
 * focus-trap assertions, and page navigation with auth checks.
 */

import { type Page, type Locator, expect } from '@playwright/test';

// ─── Radix UI ARIA role selectors ───────────────────────────────────

export const ROLES = {
  DIALOG: '[role="dialog"]',
  ALERT_DIALOG: '[role="alertdialog"]',
  MENU: '[role="menu"]',
  MENU_ITEM: '[role="menuitem"]',
  LISTBOX: '[role="listbox"]',
  OPTION: '[role="option"]',
  TAB_LIST: '[role="tablist"]',
  TAB: '[role="tab"]',
  TAB_PANEL: '[role="tabpanel"]',
  TOOLTIP: '[role="tooltip"]',
  SWITCH: '[role="switch"]',
  COMBOBOX: '[role="combobox"]',
} as const;

// ─── Common UI locators ─────────────────────────────────────────────

export const UI = {
  /** ProfileDropdown trigger in AppHeader */
  profileDropdownTrigger: 'button:has([class*="avatar"]), button[aria-label*="профил" i], button[aria-label*="Меню" i]',
  /** NotificationBell trigger */
  notificationBell: 'button[aria-label*="ведомлен" i], button[aria-label*="notification" i]',
  /** CartBadge trigger */
  cartBadge: 'button[aria-label*="орзин" i], button[aria-label*="cart" i], a[href="/store/cart"]',
  /** Mobile hamburger button */
  hamburger: 'button[aria-label*="меню" i], button[aria-label*="menu" i]',
  /** Radix overlay backdrop */
  overlay: '[data-radix-popper-content-wrapper], [role="dialog"], [role="alertdialog"]',
  /** Close button (X) inside Radix overlays */
  closeButton: 'button:has(.sr-only:text("Close")), button[aria-label="Close"], [data-radix-dialog-close]',
  /** Toast container */
  toaster: '[data-sonner-toaster], [role="status"]',
  /** Toast item */
  toast: '[data-sonner-toast], [role="status"] > div',
} as const;

// ─── Page navigation with auth check ────────────────────────────────

/**
 * Navigate to a page and wait for load. Returns false if redirected to /login
 * (auth expired) — caller should `test.skip()`.
 */
export async function waitForPage(
  page: Page,
  path: string,
  options?: { timeout?: number }
): Promise<boolean> {
  const timeout = options?.timeout ?? 30_000;

  await page.goto(path, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

/**
 * Navigate to an admin page. Returns false if not accessible.
 */
export async function waitForAdminPage(
  page: Page,
  path: string
): Promise<boolean> {
  return waitForPage(page, path, { timeout: 30_000 });
}

// ─── Overlay helpers ────────────────────────────────────────────────

/**
 * Wait for an overlay (dialog, menu, alertdialog) to become visible.
 */
export async function waitForOverlay(
  page: Page,
  role: 'dialog' | 'menu' | 'alertdialog' | 'listbox' | 'tooltip'
): Promise<Locator> {
  const locator = page.locator(`[role="${role}"]`).first();
  await expect(locator).toBeVisible({ timeout: 10_000 });
  return locator;
}

/**
 * Assert that pressing Escape dismisses the overlay.
 */
export async function expectDismissOnEscape(
  page: Page,
  overlayRole: 'dialog' | 'menu' | 'alertdialog' | 'listbox' | 'tooltip'
): Promise<void> {
  const overlay = page.locator(`[role="${overlayRole}"]`).first();
  await expect(overlay).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(overlay).not.toBeVisible({ timeout: 5_000 });
}

/**
 * Assert that clicking the backdrop dismisses the overlay.
 * Works by clicking at viewport edge, away from the overlay content.
 */
export async function expectDismissOnBackdrop(
  page: Page,
  overlayRole: 'dialog' | 'menu'
): Promise<void> {
  const overlay = page.locator(`[role="${overlayRole}"]`).first();
  await expect(overlay).toBeVisible();

  // Click at top-left corner of viewport (should be backdrop area)
  await page.mouse.click(5, 5);
  await expect(overlay).not.toBeVisible({ timeout: 5_000 });
}

// ─── Focus helpers ──────────────────────────────────────────────────

/**
 * Assert that Tab key cycles focus within a container (focus trap).
 * Checks that after pressing Tab several times, focus remains inside the container.
 */
export async function expectFocusTrap(
  page: Page,
  containerLocator: Locator
): Promise<void> {
  const container = containerLocator;
  await expect(container).toBeVisible();

  // Press Tab multiple times and verify focus stays within container
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const activeElement = page.locator(':focus');
    const isInside = await containerLocator
      .locator(':focus')
      .count()
      .then((c) => c > 0)
      .catch(() => false);

    // Allow focus to be on the container itself or inside it
    if (!isInside) {
      const activeTag = await activeElement.evaluate((el) => el.tagName).catch(() => 'UNKNOWN');
      // body focus is ok if no more focusable elements
      if (activeTag !== 'BODY') {
        expect(isInside, `Focus escaped container on Tab press #${i + 1}`).toBe(true);
      }
    }
  }
}

/**
 * Assert that after closing an overlay, focus returns to the trigger element.
 */
export async function expectFocusReturn(
  page: Page,
  triggerLocator: Locator
): Promise<void> {
  // Give a moment for focus to return
  await page.waitForTimeout(500);
  await expect(triggerLocator).toBeFocused({ timeout: 3_000 });
}

// ─── Interaction helpers ────────────────────────────────────────────

/**
 * Click a trigger element and wait for an overlay to appear.
 */
export async function clickAndWaitForOverlay(
  page: Page,
  trigger: Locator,
  overlayRole: 'dialog' | 'menu' | 'alertdialog' | 'listbox' | 'tooltip'
): Promise<Locator> {
  await trigger.click();
  return waitForOverlay(page, overlayRole);
}

/**
 * Assert that clicking an element does NOT create any new overlays.
 * Useful for testing disabled state.
 */
export async function expectNoOverlay(
  page: Page,
  overlayRole: 'dialog' | 'menu' | 'alertdialog' | 'listbox'
): Promise<void> {
  const count = await page.locator(`[role="${overlayRole}"]`).count();
  expect(count).toBe(0);
}

/**
 * Collect console errors during an action, ignoring known non-critical ones.
 */
export async function collectConsoleErrors(
  page: Page,
  action: () => Promise<void>
): Promise<string[]> {
  const errors: string[] = [];
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (
        text.includes('favicon') ||
        text.includes('404 (Not Found)') ||
        text.includes('hydration') ||
        text.includes('COOP')
      ) {
        return;
      }
      errors.push(text);
    }
  };

  page.on('console', handler);
  await action();
  page.off('console', handler);

  return errors;
}
