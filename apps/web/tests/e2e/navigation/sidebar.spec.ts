import { test as base, expect } from '@playwright/test';

const test = base;

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('MENU Section', () => {
    test('should display MENU section with correct nav items', async ({ page }) => {
      const sidebar = page.locator('aside');

      // MENU group label
      await expect(sidebar.getByText('МЕНЮ', { exact: true })).toBeVisible();

      // Nav items
      await expect(sidebar.getByRole('link', { name: 'Главная' })).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Сериалы' })).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Клипы' })).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Шортсы' })).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Обучение' })).toBeVisible();
    });
  });

  test.describe('LIBRARY Section', () => {
    test('should display LIBRARY section with correct nav items', async ({ page }) => {
      const sidebar = page.locator('aside');

      await expect(sidebar.getByText('БИБЛИОТЕКА', { exact: true })).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'История' })).toBeVisible();
      await expect(sidebar.getByRole('link', { name: 'Избранное' })).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to /clips when clicking "Клипы"', async ({ page }) => {
      const sidebar = page.locator('aside');
      await sidebar.getByRole('link', { name: 'Клипы' }).click();
      await expect(page).toHaveURL(/\/clips/);
    });

    test('should navigate to /shorts when clicking "Шортсы"', async ({ page }) => {
      const sidebar = page.locator('aside');
      await sidebar.getByRole('link', { name: 'Шортсы' }).click();
      await expect(page).toHaveURL(/\/shorts/);
    });

    test('should navigate to /tutorials when clicking "Обучение"', async ({ page }) => {
      const sidebar = page.locator('aside');
      await sidebar.getByRole('link', { name: 'Обучение' }).click();
      await expect(page).toHaveURL(/\/tutorials/);
    });

    test('should navigate to /series when clicking "Сериалы"', async ({ page }) => {
      const sidebar = page.locator('aside');
      await sidebar.getByRole('link', { name: 'Сериалы' }).click();
      await expect(page).toHaveURL(/\/series/);
    });
  });

  test.describe('Active State', () => {
    test('should highlight active nav item based on current route', async ({ page }) => {
      // Navigate to clips
      await page.goto('/clips');
      await page.waitForLoadState('networkidle');

      const sidebar = page.locator('aside');
      const clipsLink = sidebar.getByRole('link', { name: 'Клипы' });

      // Active link should have accent color class
      await expect(clipsLink).toHaveClass(/text-mp-accent-primary/);
    });

    test('should not highlight inactive nav items', async ({ page }) => {
      await page.goto('/clips');
      await page.waitForLoadState('networkidle');

      const sidebar = page.locator('aside');
      const seriesLink = sidebar.getByRole('link', { name: 'Сериалы' });

      // Inactive link should have secondary text color
      await expect(seriesLink).toHaveClass(/text-mp-text-secondary/);
    });
  });

  test.describe('Logo', () => {
    test('should display MoviePlatform logo linking to dashboard', async ({ page }) => {
      const sidebar = page.locator('aside');
      const logo = sidebar.getByRole('link').filter({ has: page.getByText('MoviePlatform') });
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute('href', '/dashboard');
    });
  });

  test.describe('Bottom Section', () => {
    test('should display Settings link', async ({ page }) => {
      const sidebar = page.locator('aside');
      await expect(sidebar.getByRole('link', { name: 'Настройки' })).toBeVisible();
    });

    test('should display Log Out button', async ({ page }) => {
      const sidebar = page.locator('aside');
      await expect(sidebar.getByRole('button', { name: /Выйти/i })).toBeVisible();
    });
  });
});
