import { test, expect, MOCK_PROFILE } from '../fixtures/account.fixture';

const CURRENT_EMAIL = MOCK_PROFILE.email; // user@test.movieplatform.ru
const NEW_EMAIL = 'newemail@example.com';
const VALID_OTP = '123456';

/**
 * Helper: set up auth state (cookies + localStorage) so the account page loads
 * without a real login flow. Also mocks common endpoints the page needs.
 */
async function setupAuthAndCommonMocks(page: import('@playwright/test').Page) {
  // Auth cookies for middleware
  await page.context().addCookies([
    { name: 'mp-authenticated', value: 'true', domain: 'localhost', path: '/' },
    { name: 'mp-auth-token', value: 'mock-access-token', domain: 'localhost', path: '/' },
  ]);

  // Client-side auth store hydration
  await page.addInitScript(() => {
    localStorage.setItem(
      'mp-auth-storage',
      JSON.stringify({
        state: {
          user: {
            id: 'user-1',
            email: 'user@test.movieplatform.ru',
            firstName: 'Тест',
            lastName: 'Пользователь',
            role: 'USER',
            ageCategory: '18+',
            referralCode: 'TESTREF123',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          isAuthenticated: true,
          isHydrated: true,
        },
        version: 0,
      }),
    );
  });

  // Mock auth refresh
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: 'mock-access-token-refreshed',
          refreshToken: 'mock-refresh-token-refreshed',
        },
      }),
    });
  });

  // Mock /users/me (auth store revalidation) — pass through sub-routes
  await page.route('**/api/v1/users/me', async (route) => {
    const url = route.request().url();
    if (
      url.includes('/profile') ||
      url.includes('/email') ||
      url.includes('/verification') ||
      url.includes('/preferences') ||
      url.includes('/avatar')
    ) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-1',
          email: CURRENT_EMAIL,
          firstName: 'Тест',
          lastName: 'Пользователь',
          role: 'USER',
          ageCategory: '18+',
          referralCode: 'TESTREF123',
        },
      }),
    });
  });

  // Mock notifications unread count
  await page.route('**/api/v1/notifications/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { count: 0 } }),
    });
  });
}

test.describe('Email Change', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndCommonMocks(page);
    await page.goto('/account/profile');
    await page.waitForLoadState('networkidle');
  });

  // =====================================================================
  // 1. Display mode
  // =====================================================================

  test.describe('Display Mode', () => {
    test('should show email with "Изменить" button', async ({ page }) => {
      const emailInput = page.locator('input#email');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeDisabled();
      await expect(emailInput).toHaveValue(CURRENT_EMAIL);

      const changeBtn = page.getByRole('button', { name: /Изменить/ });
      await expect(changeBtn).toBeVisible();
    });
  });

  // =====================================================================
  // 2-3. Editing step — open / cancel
  // =====================================================================

  test.describe('Editing Mode', () => {
    test('clicking "Изменить" should show new email input and "Отправить код" button', async ({ page }) => {
      await page.getByRole('button', { name: /Изменить/ }).click();

      const newEmailInput = page.locator('input#newEmail');
      await expect(newEmailInput).toBeVisible();
      await expect(newEmailInput).toHaveAttribute('placeholder', 'Введите новый email');

      await expect(page.getByRole('button', { name: /Отправить код/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Отмена/ })).toBeVisible();
    });

    test('"Отмена" should return to display mode', async ({ page }) => {
      await page.getByRole('button', { name: /Изменить/ }).click();
      await expect(page.locator('input#newEmail')).toBeVisible();

      await page.getByRole('button', { name: /Отмена/ }).click();

      // Back to display mode: disabled email input + Изменить button
      await expect(page.locator('input#email')).toBeDisabled();
      await expect(page.getByRole('button', { name: /Изменить/ })).toBeVisible();
    });
  });

  // =====================================================================
  // 4. Email format validation
  // =====================================================================

  test.describe('Email Validation', () => {
    test('should validate email format before sending', async ({ page }) => {
      await page.getByRole('button', { name: /Изменить/ }).click();

      await page.locator('input#newEmail').fill('invalid-email');
      await page.getByRole('button', { name: /Отправить код/ }).click();

      await expect(page.getByText('Укажите корректный email')).toBeVisible();
    });

    // 5. Same email as current
    test('should show error if same email as current', async ({ page }) => {
      await page.getByRole('button', { name: /Изменить/ }).click();

      await page.locator('input#newEmail').fill(CURRENT_EMAIL);
      await page.getByRole('button', { name: /Отправить код/ }).click();

      await expect(page.getByText('Новый email совпадает с текущим')).toBeVisible();
    });
  });

  // =====================================================================
  // 6. Transition to verification step
  // =====================================================================

  test.describe('Verification Transition', () => {
    test('should transition to verification step after successful request', async ({ page }) => {
      // Mock the request-code endpoint
      await page.route('**/api/v1/users/me/email/request-code', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { message: 'Код подтверждения отправлен' },
            }),
          });
        } else {
          await route.fallback();
        }
      });

      await page.getByRole('button', { name: /Изменить/ }).click();
      await page.locator('input#newEmail').fill(NEW_EMAIL);
      await page.getByRole('button', { name: /Отправить код/ }).click();

      // Should show verification UI
      await expect(page.getByText('Код подтверждения')).toBeVisible();
      await expect(page.getByText(NEW_EMAIL)).toBeVisible();
    });
  });

  // =====================================================================
  // 7-9. Verification mode — OTP, disabled button, resend cooldown
  // =====================================================================

  test.describe('Verification Mode', () => {
    test.beforeEach(async ({ page }) => {
      // Mock request-code endpoint
      await page.route('**/api/v1/users/me/email/request-code', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { message: 'Код подтверждения отправлен' },
            }),
          });
        } else {
          await route.fallback();
        }
      });

      // Navigate to verification step
      await page.getByRole('button', { name: /Изменить/ }).click();
      await page.locator('input#newEmail').fill(NEW_EMAIL);
      await page.getByRole('button', { name: /Отправить код/ }).click();

      // Wait for verification UI
      await expect(page.getByText('Код подтверждения')).toBeVisible();
    });

    test('should show OTP inputs and "Подтвердить" button', async ({ page }) => {
      // 6 OTP digit inputs
      const otpInputs = page.locator('input[inputmode="numeric"]');
      await expect(otpInputs).toHaveCount(6);

      await expect(page.getByRole('button', { name: /Подтвердить/ })).toBeVisible();
    });

    test('"Подтвердить" should be disabled until 6 digits entered', async ({ page }) => {
      const confirmBtn = page.getByRole('button', { name: /Подтвердить/ });
      await expect(confirmBtn).toBeDisabled();

      // Enter only 3 digits
      const otpInputs = page.locator('input[inputmode="numeric"]');
      await otpInputs.nth(0).fill('1');
      await otpInputs.nth(1).fill('2');
      await otpInputs.nth(2).fill('3');

      await expect(confirmBtn).toBeDisabled();

      // Fill remaining 3 digits
      await otpInputs.nth(3).fill('4');
      await otpInputs.nth(4).fill('5');
      await otpInputs.nth(5).fill('6');

      await expect(confirmBtn).toBeEnabled();
    });

    test('should show "Отправить заново" with cooldown timer', async ({ page }) => {
      const resendBtn = page.getByRole('button', { name: /Отправить заново/ });
      await expect(resendBtn).toBeVisible();
      await expect(resendBtn).toBeDisabled();
      await expect(resendBtn).toContainText(/\d+с/);
    });

    // 10. Wrong code error
    test('should show error on wrong code', async ({ page }) => {
      // Mock confirm endpoint with error
      await page.route('**/api/v1/users/me/email/confirm', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'INVALID_CODE', message: 'Неверный код' },
            }),
          });
        } else {
          await route.fallback();
        }
      });

      // Fill OTP
      const otpInputs = page.locator('input[inputmode="numeric"]');
      await otpInputs.nth(0).fill('9');
      await otpInputs.nth(1).fill('9');
      await otpInputs.nth(2).fill('9');
      await otpInputs.nth(3).fill('9');
      await otpInputs.nth(4).fill('9');
      await otpInputs.nth(5).fill('9');

      await page.getByRole('button', { name: /Подтвердить/ }).click();

      await expect(page.getByText('Неверный код')).toBeVisible();
    });

    // 11. Successful confirmation
    test('should update email on successful confirmation', async ({ page }) => {
      // Mock confirm endpoint with success
      await page.route('**/api/v1/users/me/email/confirm', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { ...MOCK_PROFILE, email: NEW_EMAIL },
            }),
          });
        } else {
          await route.fallback();
        }
      });

      // Fill OTP
      const otpInputs = page.locator('input[inputmode="numeric"]');
      await otpInputs.nth(0).fill('1');
      await otpInputs.nth(1).fill('2');
      await otpInputs.nth(2).fill('3');
      await otpInputs.nth(3).fill('4');
      await otpInputs.nth(4).fill('5');
      await otpInputs.nth(5).fill('6');

      await page.getByRole('button', { name: /Подтвердить/ }).click();

      // Should show success toast
      await expect(page.getByText('Email успешно изменён')).toBeVisible();

      // Should return to display mode
      await expect(page.getByRole('button', { name: /Изменить/ })).toBeVisible();
    });

    // 12. Cancel from verification
    test('cancel from verification returns to display', async ({ page }) => {
      await page.getByRole('button', { name: /Отмена/ }).click();

      // Should be back in display mode
      await expect(page.locator('input#email')).toBeDisabled();
      await expect(page.getByRole('button', { name: /Изменить/ })).toBeVisible();

      // OTP inputs should be gone
      await expect(page.locator('input[inputmode="numeric"]')).toHaveCount(0);
    });
  });
});
