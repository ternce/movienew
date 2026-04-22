import { test, expect } from '@playwright/test';

/**
 * Phase 15 — Not Found Pages
 *
 * Verifies that non-existent routes are handled gracefully:
 * - No server crash (500)
 * - Page renders some content (custom 404 or Next.js fallback)
 * - Russian text or at least valid HTML
 *
 * NO auth required — uses default Chrome context (no storageState).
 */

test.describe('Not Found Pages', () => {
  test('/this-page-does-not-exist returns a page (not server crash)', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // The server should respond (not 502/503 crash)
    expect(response).not.toBeNull();
    const status = response?.status() ?? 0;
    // Accept 200 (custom 404 page), 404, or 308 redirect — just not 500/502/503
    expect(status).toBeLessThan(500);

    // Page should render HTML content (not blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('/series/nonexistent-slug-xyz-123 handles gracefully', async ({ page }) => {
    const response = await page.goto('/series/nonexistent-slug-xyz-123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(response).not.toBeNull();
    const status = response?.status() ?? 0;
    expect(status).toBeLessThan(500);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('/clips/nonexistent-slug handles gracefully', async ({ page }) => {
    const response = await page.goto('/clips/nonexistent-slug');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(response).not.toBeNull();
    const status = response?.status() ?? 0;
    expect(status).toBeLessThan(500);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('404-style page has some content (not blank)', async ({ page }) => {
    await page.goto('/absolutely-no-such-route-exists-here');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    // Page should have meaningful content — at least navigation or an error message
    expect(bodyText.trim().length).toBeGreaterThan(10);
  });

  test('404-style page has Russian text or at least renders HTML', async ({ page }) => {
    await page.goto('/not-a-real-page-xyz');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    const hasCyrillic = /[\u0400-\u04FF]/.test(bodyText);

    // Check that there's at least valid HTML with some content
    const hasHtmlContent = bodyText.trim().length > 5;

    // Either has Russian text (custom 404) or at least renders HTML (Next.js default)
    expect(hasCyrillic || hasHtmlContent).toBe(true);
  });
});
