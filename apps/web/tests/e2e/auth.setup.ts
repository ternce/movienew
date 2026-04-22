import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Setup authentication state for E2E tests
 * This runs once before all other tests and saves auth state
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page).toHaveURL(/\/login/);

  // Fill in credentials
  // Note: In real implementation, use test user credentials from env
  await page.fill('[name="email"]', process.env.E2E_TEST_EMAIL || 'test@movieplatform.ru');
  await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123!');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect after successful login
  await page.waitForURL(/\/(dashboard|home)/);

  // Verify we're logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });
});

/**
 * Setup for unauthenticated tests
 */
setup.describe('unauthenticated', () => {
  setup('clear auth', async ({ page }) => {
    // Clear all cookies and storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
});
