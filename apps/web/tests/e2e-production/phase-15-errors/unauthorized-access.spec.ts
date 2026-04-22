import { test, expect } from '@playwright/test';

/**
 * Phase 15 — Unauthorized Access
 *
 * Verifies that unauthenticated users are redirected to /login
 * when accessing protected routes. Each test creates a fresh
 * browser context with NO storageState.
 *
 * NO auth required — uses default Chrome context (no storageState).
 *
 * Note: The admin panel uses a client-side AdminAuthGuard that may
 * not change the URL but renders a login form instead of admin content.
 */

test.describe('Unauthorized Access — redirects to login', () => {
  test('/account redirects unauthenticated user to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/account');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();
      const redirectedToLogin =
        url.includes('/login') || url.includes('/auth');

      expect(redirectedToLogin).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('/partner redirects unauthenticated user to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/partner');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();
      const redirectedToLogin =
        url.includes('/login') || url.includes('/auth');

      expect(redirectedToLogin).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('/bonuses redirects unauthenticated user to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/bonuses');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();
      const redirectedToLogin =
        url.includes('/login') || url.includes('/auth');

      expect(redirectedToLogin).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('/admin/dashboard redirects unauthenticated user', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/admin/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();

      // The admin panel uses a client-side AdminAuthGuard.
      // It may either:
      // 1. Redirect the URL to /login or /
      // 2. Keep the URL as /admin/dashboard but render a login form instead of admin content
      const redirectedAway = !url.includes('/admin');

      // Check if page shows a login form (email input) instead of admin content
      const showsLoginForm = await page
        .locator('input[name="email"], input[type="email"]')
        .first()
        .isVisible()
        .catch(() => false);

      // Check if admin dashboard content is actually visible
      const showsAdminContent = await page
        .getByText('Панель управления')
        .isVisible()
        .catch(() => false);

      // Success if: redirected away from /admin OR shows login form OR no admin content visible
      expect(redirectedAway || showsLoginForm || !showsAdminContent).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('/studio redirects unauthenticated user to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/studio');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();
      const redirectedToLogin =
        url.includes('/login') || url.includes('/auth');

      expect(redirectedToLogin).toBe(true);
    } finally {
      await context.close();
    }
  });
});
