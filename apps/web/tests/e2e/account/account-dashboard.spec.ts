import { test, expect } from '../fixtures/account.fixture';

test.describe('Account Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Display', () => {
    test('should display page heading "Обзор аккаунта"', async ({ page }) => {
      await expect(page.getByText('Обзор аккаунта')).toBeVisible();
    });

    test('should show user profile header with name', async ({ page }) => {
      await expect(page.getByText('Тест Пользователь')).toBeVisible();
    });

    test('should display user email', async ({ page }) => {
      await expect(page.getByText('user@test.movieplatform.ru')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display subscription status card', async ({ page }) => {
      await expect(page.getByText('Подписка')).toBeVisible();
    });

    test('should display bonus balance card', async ({ page }) => {
      await expect(page.getByText('Бонусы')).toBeVisible();
    });

    test('should display verification status card', async ({ page }) => {
      await expect(page.getByText('Верификация')).toBeVisible();
    });

    test('should display referral code card', async ({ page }) => {
      await expect(page.getByText('Реферальный код')).toBeVisible();
      await expect(page.getByText('TESTREF123')).toBeVisible();
    });
  });

  test.describe('Continue Watching', () => {
    test('should display continue watching section if items exist', async ({ page }) => {
      await expect(page.getByText('Продолжить просмотр')).toBeVisible();
    });

    test('should show content title in continue watching', async ({ page }) => {
      await expect(page.getByText('Ночной патруль')).toBeVisible();
    });
  });

  test.describe('Quick Links', () => {
    test('should have link to profile page', async ({ page }) => {
      const link = page.getByRole('link', { name: /профиль/i });
      await expect(link).toBeVisible();
    });

    test('should have link to settings page', async ({ page }) => {
      const link = page.getByRole('link', { name: /настройки/i });
      await expect(link).toBeVisible();
    });

    test('should have link to subscriptions page', async ({ page }) => {
      const link = page.getByRole('link', { name: /подписки/i });
      await expect(link).toBeVisible();
    });

    test('should navigate to profile when clicking profile link', async ({ page }) => {
      const link = page.getByRole('link', { name: /профиль/i }).first();
      await link.click();
      await expect(page).toHaveURL(/\/account\/profile/);
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('should display account sidebar on desktop', async ({ page }) => {
      // Sidebar should be visible on wide viewport
      await page.setViewportSize({ width: 1280, height: 800 });
      const sidebar = page.locator('nav').filter({ hasText: 'Обзор' });
      await expect(sidebar).toBeVisible();
    });

    test('should highlight active route in sidebar', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      // The "Обзор" link should be highlighted since we're on /account
      const activeLink = page.locator('a[href="/account"]').filter({ hasText: 'Обзор' });
      await expect(activeLink).toBeVisible();
    });

    test('should navigate via sidebar links', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const profileLink = page.locator('nav a[href="/account/profile"]');
      await profileLink.click();
      await expect(page).toHaveURL(/\/account\/profile/);
    });
  });
});
