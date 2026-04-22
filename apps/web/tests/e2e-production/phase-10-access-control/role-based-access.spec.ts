import { test, expect } from '@playwright/test';

/**
 * Phase 10 — Role-Based Access Control
 *
 * Verifies that:
 * - Unauthenticated (GUEST) users are redirected from protected routes to /login
 * - Authenticated BUYER cannot access admin routes
 * - Public pages remain accessible without authentication
 *
 * Default storageState: user-state.json (BUYER role) — set by Playwright config.
 * Unauthenticated tests create a fresh browser context with NO storageState.
 */

test.describe('Role-Based Access — Guest redirects', () => {
  test('unauthenticated user visiting /account is redirected to /login', async ({
    browser,
  }) => {
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

  test('unauthenticated user visiting /partner is redirected to /login', async ({
    browser,
  }) => {
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

  test('unauthenticated user visiting /bonuses is redirected to /login', async ({
    browser,
  }) => {
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

  test('unauthenticated user visiting /store/checkout is redirected to /login', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/store/checkout');
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

  test('unauthenticated user visiting /studio is redirected to /login', async ({
    browser,
  }) => {
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

test.describe('Role-Based Access — BUYER cannot access admin', () => {
  // These tests use the default context (user-state.json = BUYER role)

  test('authenticated BUYER visiting /admin/dashboard gets redirected or blocked', async ({
    page,
  }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const url = page.url();
    // Admin uses client-side AdminAuthGuard — may stay on URL but render login form
    const redirectedAway = !url.includes('/admin');
    const showsLoginForm = await page.locator('input[name="email"]').isVisible().catch(() => false);
    const showsAdminContent = await page.getByText('Панель управления').isVisible().catch(() => false);

    // BUYER should either be redirected away OR see login form instead of admin content
    expect(redirectedAway || showsLoginForm || !showsAdminContent).toBe(true);
  });

  test('authenticated BUYER visiting /admin/users gets redirected or blocked', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const url = page.url();
    const redirectedAway = !url.includes('/admin');
    const showsLoginForm = await page.locator('input[name="email"]').isVisible().catch(() => false);
    const showsAdminUserTable = await page.locator('table').isVisible().catch(() => false);

    expect(redirectedAway || showsLoginForm || !showsAdminUserTable).toBe(true);
  });

  test('authenticated BUYER visiting /admin/content gets redirected or blocked', async ({
    page,
  }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const url = page.url();
    const redirectedAway = !url.includes('/admin');
    const showsLoginForm = await page.locator('input[name="email"]').isVisible().catch(() => false);
    const showsAdminContentTable = await page.locator('table').isVisible().catch(() => false);

    expect(redirectedAway || showsLoginForm || !showsAdminContentTable).toBe(true);
  });
});

test.describe('Role-Based Access — Public pages', () => {
  test('landing page (/) is accessible without auth', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();
      // Should NOT redirect to /login — landing page is public
      const redirectedToLogin = url.includes('/login');
      expect(redirectedToLogin).toBe(false);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(50);
    } finally {
      await context.close();
    }
  });

  test('/series page renders without crashing', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/series');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      const url = page.url();
      const isAccessible = !url.includes('/login');
      const isRedirectedToAuth = url.includes('/login');

      // /series is either publicly accessible OR redirects to auth.
      // Both are valid production behaviors depending on middleware config.
      // Either way, the page should render (not crash).
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(10);
    } finally {
      await context.close();
    }
  });
});
