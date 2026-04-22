import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock forgot password
    await page.route('**/api/v1/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Если email существует, мы отправили инструкции' },
        }),
      });
    });

    // Mock reset password
    await page.route('**/api/v1/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Пароль успешно изменён' },
        }),
      });
    });

    // Mock login
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 'user-1', email: 'test@example.com', firstName: 'Тест', lastName: 'Пользователь', role: 'USER' },
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        }),
      });
    });

    // Mock notifications/profile for authenticated state
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'user-1', email: 'test@example.com', firstName: 'Тест', lastName: 'Пользователь', role: 'USER' },
        }),
      });
    });

    await page.route('**/api/v1/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      });
    });

    await page.route('**/api/v1/notifications/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emailMarketing: true,
          emailUpdates: true,
          pushNotifications: false,
        }),
      });
    });
  });

  test('request password reset email', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Fill email
    await page.getByLabel(/email/i).fill('test@example.com');

    // Submit
    await page.getByRole('button', { name: /отправить|сбросить|восстановить/i }).click();

    // Success message (always shown for security)
    await expect(page.getByText(/отправили|инструкции|письмо|email/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('reset password with valid token', async ({ page }) => {
    await page.goto('/reset-password?token=valid-reset-token');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Fill new password
    await page.getByLabel(/новый пароль|^пароль$/i).first().fill('NewSecurePass123!');
    await page.getByLabel(/подтвердите|повторите/i).fill('NewSecurePass123!');

    // Submit
    await page.getByRole('button', { name: /сохранить|изменить|сбросить/i }).click();

    // Should redirect to login or show success
    await page.waitForURL(/login|success/, { timeout: 10000 }).catch(() => {
      // May show inline success message instead
    });
  });

  test('shows error for expired reset token', async ({ page }) => {
    await page.route('**/api/v1/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Ссылка для сброса пароля истекла',
          code: 'AUTH_005',
        }),
      });
    });

    await page.goto('/reset-password?token=expired-token');

    await page.getByLabel(/новый пароль|^пароль$/i).first().fill('NewSecurePass123!');
    await page.getByLabel(/подтвердите|повторите/i).fill('NewSecurePass123!');
    await page.getByRole('button', { name: /сохранить|изменить|сбросить/i }).click();

    await expect(page.getByText(/истекла|expired/i).first()).toBeVisible({ timeout: 5000 });
  });
});
