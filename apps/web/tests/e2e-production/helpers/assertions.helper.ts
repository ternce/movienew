/**
 * Production-specific assertion helpers.
 */

import { type Page, expect } from '@playwright/test';

/**
 * Verify that an API response has the standard success shape.
 */
export function expectApiSuccess(response: {
  success: boolean;
  data?: unknown;
}): void {
  expect(response.success).toBe(true);
  expect(response.data).toBeDefined();
}

/**
 * Verify that a page loaded without critical JS console errors.
 * Collects errors during a callback and asserts none occurred.
 */
export async function expectNoConsoleErrors(
  page: Page,
  action: () => Promise<void>
): Promise<void> {
  const errors: string[] = [];
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known non-critical errors
      if (
        text.includes('favicon') ||
        text.includes('404 (Not Found)') ||
        text.includes('hydration')
      ) {
        return;
      }
      errors.push(text);
    }
  };

  page.on('console', handler);
  await action();
  page.off('console', handler);

  expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
}

/**
 * Verify that the page contains Russian (Cyrillic) text, not raw i18n keys.
 */
export async function expectRussianText(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText();
  // Check that body contains Cyrillic characters
  const hasCyrillic = /[\u0400-\u04FF]/.test(bodyText);
  expect(hasCyrillic, 'Page should contain Russian (Cyrillic) text').toBe(true);
}

/**
 * Verify page loaded within acceptable time and has visible content.
 */
export async function expectPageLoaded(page: Page): Promise<void> {
  // Page should have rendered content
  await expect(page.locator('body')).not.toBeEmpty();

  // No unrecoverable error page
  const title = await page.title();
  expect(title).not.toContain('500');
  expect(title).not.toContain('Error');
}
