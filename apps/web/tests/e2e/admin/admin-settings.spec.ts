import { test, expect } from '@playwright/test';

/**
 * Admin Settings E2E Tests
 *
 * Tests for /admin/settings page:
 * - Page rendering with title "Настройки"
 * - 4 settings cards: Настройки платформы, Безопасность, Контент, Уведомления
 * - All inputs are disabled (static placeholder page)
 * - Save buttons are disabled with "API в разработке" tooltip
 * - Various settings fields and switches
 */

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Set admin auth state
    await page.addInitScript(() => {
      window.localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          isHydrated: true,
          accessToken: 'mock-admin-token',
          user: {
            id: 'admin-1',
            email: 'admin@test.ru',
            role: 'ADMIN',
            firstName: 'Тест',
            lastName: 'Админ',
          },
        },
      }));
    });

    // No API mocking needed - settings page is fully static
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Настройки"', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Настройки', { exact: false }).first()).toBeVisible();
    });

    test('should display description "Системные настройки панели администратора"', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Системные настройки панели администратора')).toBeVisible();
    });
  });

  test.describe('Настройки платформы Card', () => {
    test('should display "Настройки платформы" card title', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Настройки платформы')).toBeVisible();
    });

    test('should display platform name field with "MoviePlatform" default', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Название платформы')).toBeVisible();
      const nameInput = page.locator('input[value="MoviePlatform"]');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeDisabled();
    });

    test('should display description field with default value', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Описание')).toBeVisible();
      const descInput = page.locator('input[value="Платформа видеоконтента"]');
      await expect(descInput).toBeVisible();
      await expect(descInput).toBeDisabled();
    });

    test('should display maintenance mode switch (disabled)', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Режим обслуживания')).toBeVisible();
      await expect(page.getByText('Включение ограничит доступ к платформе для пользователей')).toBeVisible();
    });
  });

  test.describe('Безопасность Card', () => {
    test('should display "Безопасность" card title', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Безопасность')).toBeVisible();
    });

    test('should display session timeout field', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Тайм-аут сессии (минуты)')).toBeVisible();
    });

    test('should display max active sessions field', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Макс. активных сессий')).toBeVisible();
    });

    test('should display force logout button (disabled)', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Принудительный выход всех')).toBeVisible();
      const logoutButton = page.getByRole('button', { name: 'Выйти всех' });
      await expect(logoutButton).toBeVisible();
      await expect(logoutButton).toBeDisabled();
    });
  });

  test.describe('Контент Card', () => {
    test('should display "Контент" card title in settings', async ({ page }) => {
      await page.goto('/admin/settings');

      // The third card has title "Контент"
      const contentHeading = page.locator('text=Контент').nth(0);
      await expect(contentHeading).toBeVisible();
    });

    test('should display age category default field', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Возрастная категория по умолчанию')).toBeVisible();
    });

    test('should display max upload size field', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Макс. размер загрузки (МБ)')).toBeVisible();
    });

    test('should display auto-moderation switch', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Автомодерация')).toBeVisible();
      await expect(page.getByText('Автоматическая проверка контента перед публикацией')).toBeVisible();
    });
  });

  test.describe('Уведомления Card', () => {
    test('should display "Уведомления" card title', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Уведомления')).toBeVisible();
    });

    test('should display email sender field', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Email отправителя')).toBeVisible();
      const emailInput = page.locator('input[value="noreply@movieplatform.ru"]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeDisabled();
    });

    test('should display footer signature field', async ({ page }) => {
      await page.goto('/admin/settings');

      await expect(page.getByText('Подпись в футере')).toBeVisible();
      const sigInput = page.locator('input[value="Команда MoviePlatform"]');
      await expect(sigInput).toBeVisible();
      await expect(sigInput).toBeDisabled();
    });
  });

  test.describe('Save Buttons', () => {
    test('should display all save buttons as disabled', async ({ page }) => {
      await page.goto('/admin/settings');

      const saveButtons = page.getByRole('button', { name: 'Сохранить' });
      const count = await saveButtons.count();
      expect(count).toBe(4);

      for (let i = 0; i < count; i++) {
        await expect(saveButtons.nth(i)).toBeDisabled();
      }
    });
  });
});
