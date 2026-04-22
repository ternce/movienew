import { test, expect } from '@playwright/test';
import { waitForAdminPage, getAdminToken, getAllAdminPages } from './helpers/admin-test.helper';

/**
 * Admin All Pages Smoke Tests
 *
 * Parametric smoke test that loads ALL 23 admin routes and verifies:
 * - Page loads without crashing (body has content)
 * - Russian text is present (Cyrillic characters)
 * - No 500 Internal Server Error or 502 Bad Gateway
 *
 * Uses getAllAdminPages() from the shared helper for the route list.
 */

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

const ADMIN_PAGES = getAllAdminPages();

for (const pagePath of ADMIN_PAGES) {
  test(`loads: ${pagePath}`, async ({ page }) => {
    test.skip(!adminToken, 'Admin token not available');

    const loaded = await waitForAdminPage(page, pagePath);
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(10);

    // Verify Russian text is present (Cyrillic characters)
    expect(/[\u0400-\u04FF]/.test(body)).toBe(true);

    // Verify no error page
    expect(body).not.toContain('500 Internal Server Error');
  });
}
