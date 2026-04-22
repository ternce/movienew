import { test as base, expect } from '@playwright/test';

const test = base;

test.describe('Page Transitions', () => {
  test.describe('Animation', () => {
    test('should render page content', async ({ page }) => {
      await page.goto('/clips');
      await page.waitForLoadState('networkidle');

      // Page content should be visible
      await expect(page.getByText('Клипы')).toBeVisible();
    });

    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Emulate reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/clips');
      await page.waitForLoadState('networkidle');

      // Page should still load correctly without animations
      await expect(page.getByText('Клипы')).toBeVisible();
    });
  });
});

test.describe('404 Not Found Page', () => {
  test('should display "Страница не найдена" for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Страница не найдена')).toBeVisible();
  });

  test('should display 404 graphic', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('404').first()).toBeVisible();
  });

  test('should show "На главную" button that navigates to /', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    const homeLink = page.getByRole('link', { name: /На главную/i });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/');
  });

  test('should show "Назад" button', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    const backButton = page.getByRole('button', { name: /Назад/i });
    await expect(backButton).toBeVisible();
  });

  test('should have descriptive error message', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/запрашиваемая страница не существует/i)).toBeVisible();
  });
});
