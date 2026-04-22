import { test, expect } from '../fixtures/auth.fixture';
import { mockForgotPasswordApi } from '../helpers/mock-api';

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ resetPasswordPage }) => {
    await resetPasswordPage.gotoForgotPassword();
  });

  test.describe('Form Display', () => {
    test('should display forgot password form with email input and submit button', async ({ page }) => {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should display descriptive text about password reset process', async ({ page }) => {
      await expect(page.getByText(/Забыли пароль/)).toBeVisible();
      await expect(page.getByText(/инструкции по сбросу/i)).toBeVisible();
    });
  });

  test.describe('Successful Submission', () => {
    test('should show success message after submitting valid email', async ({ page, resetPasswordPage }) => {
      await mockForgotPasswordApi(page, 'success');

      await resetPasswordPage.requestPasswordReset('test@example.com');
      await expect(page.getByText(/Проверьте почту/)).toBeVisible();
    });

    test('should show success even for non-existent email (security)', async ({ page, resetPasswordPage }) => {
      await mockForgotPasswordApi(page, 'success');

      await resetPasswordPage.requestPasswordReset('nonexistent@example.com');
      await expect(page.getByText(/Проверьте почту/)).toBeVisible();
    });
  });

  test.describe('Validation Errors', () => {
    test('should show validation error for empty email submission', async ({ page }) => {
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/email обязателен/i)).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.locator('input[type="email"]').fill('invalid-email');
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/корректный email/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to /login when clicking "Вернуться к входу" link', async ({ page }) => {
      await page.getByRole('link', { name: /вернуться к входу|вход|войти|назад/i }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle server error gracefully', async ({ page, resetPasswordPage }) => {
      await mockForgotPasswordApi(page, 'error');
      await resetPasswordPage.requestPasswordReset('test@example.com');
      // Even on error, the page shows success for security
      await expect(page.getByText(/Проверьте почту/)).toBeVisible();
    });

    test('should handle rate limiting', async ({ page, resetPasswordPage }) => {
      await mockForgotPasswordApi(page, 'rate_limit');
      await resetPasswordPage.requestPasswordReset('test@example.com');
      // The page always shows success (security) — the onError handler also sets isSubmitted=true
      await expect(page.getByText(/Проверьте почту/)).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable (Tab → email → Tab → submit)', async ({ page }) => {
      // Email input should be auto-focused
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeFocused();

      // Tab to submit button
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });

    test('should have proper form labels and accessibility attributes', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]');
      const label = page.locator('label[for="email"]');
      await expect(label).toBeVisible();
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });
  });
});
