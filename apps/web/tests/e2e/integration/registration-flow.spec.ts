import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock registration endpoint
    await page.route('**/api/v1/auth/register', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'new-user-1',
              email: body.email,
              firstName: body.firstName,
              lastName: body.lastName,
              role: 'USER',
            },
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        }),
      });
    });

    // Mock profile
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'new-user-1',
            email: 'test@example.com',
            firstName: 'Тест',
            lastName: 'Пользователь',
            role: 'USER',
          },
        }),
      });
    });

    // Mock notification count
    await page.route('**/api/v1/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0 }),
      });
    });

    // Mock notifications preferences
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

  test('complete registration flow with valid data', async ({ page }) => {
    await page.goto('/register');

    // Verify registration form is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Fill form
    await page.getByLabel(/имя/i).first().fill('Тест');
    await page.getByLabel(/фамилия/i).first().fill('Пользователь');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/дата рождения/i).fill('1995-06-15');
    await page.getByLabel(/^пароль$/i).fill('SecurePass123!');
    await page.getByLabel(/подтвердите/i).fill('SecurePass123!');

    // Accept terms
    const checkbox = page.getByRole('checkbox');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    // Submit
    await page.getByRole('button', { name: /зарегистрироваться|создать/i }).click();

    // Should redirect to dashboard or home after registration
    await page.waitForURL(/(\/|\/dashboard|\/account)/, { timeout: 10000 });
  });

  test('registration with referral code', async ({ page }) => {
    await page.goto('/register?ref=PARTNER123');

    // Referral code field should be pre-filled or visible
    const referralInput = page.getByLabel(/реферальный|партнёрский/i);
    if (await referralInput.isVisible()) {
      await expect(referralInput).toHaveValue('PARTNER123');
    }
  });

  test('shows validation errors for empty form', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.getByRole('button', { name: /зарегистрироваться|создать/i }).click();

    // Should show validation errors
    await expect(page.getByText(/обязательное/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('shows error for duplicate email', async ({ page }) => {
    // Override mock to return conflict
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Пользователь с таким email уже существует',
          code: 'AUTH_007',
        }),
      });
    });

    await page.goto('/register');

    await page.getByLabel(/имя/i).first().fill('Тест');
    await page.getByLabel(/фамилия/i).first().fill('Пользователь');
    await page.getByLabel(/email/i).fill(TEST_USERS.user.email);
    await page.getByLabel(/дата рождения/i).fill('1995-06-15');
    await page.getByLabel(/^пароль$/i).fill('SecurePass123!');
    await page.getByLabel(/подтвердите/i).fill('SecurePass123!');

    const checkbox = page.getByRole('checkbox');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    await page.getByRole('button', { name: /зарегистрироваться|создать/i }).click();

    // Should show error message
    await expect(page.getByText(/уже существует|email/i).first()).toBeVisible({ timeout: 5000 });
  });
});
