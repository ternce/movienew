import { test, expect, TEST_USERS, generateTestEmail } from '../fixtures/auth.fixture';

test.describe('Password Reset', () => {
  test.describe('Forgot Password - Request Reset', () => {
    test.beforeEach(async ({ resetPasswordPage }) => {
      await resetPasswordPage.gotoForgotPassword();
    });

    test('should display forgot password form', async ({ resetPasswordPage }) => {
      await expect(resetPasswordPage.emailInput).toBeVisible();
      await expect(resetPasswordPage.submitButton).toBeVisible();
    });

    test('should send reset email for valid registered email', async ({ resetPasswordPage, page }) => {
      // Mock successful API response
      await page.route('**/api/v1/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Письмо для сброса пароля отправлено',
          }),
        });
      });

      await resetPasswordPage.requestPasswordReset(TEST_USERS.user.email);

      await resetPasswordPage.expectSuccess(/письмо|отправлен|email|sent/i);
    });

    test('should show success even for non-existent email (security)', async ({ resetPasswordPage, page }) => {
      // For security, should not reveal if email exists
      await page.route('**/api/v1/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Если email зарегистрирован, вы получите письмо',
          }),
        });
      });

      await resetPasswordPage.requestPasswordReset(generateTestEmail('nonexistent'));

      // Should show generic success (security best practice)
      await resetPasswordPage.expectSuccess(/письмо|отправлен|если.*зарегистрирован/i);
    });

    test('should show error for invalid email format', async ({ resetPasswordPage }) => {
      await resetPasswordPage.requestPasswordReset('invalid-email');

      await resetPasswordPage.expectError(/email|почт|формат/i);
    });

    test('should show error for empty email', async ({ resetPasswordPage }) => {
      await resetPasswordPage.submitButton.click();

      await resetPasswordPage.expectError(/email|почт|обязательн/i);
    });

    test('should have link back to login', async ({ resetPasswordPage, page }) => {
      await resetPasswordPage.backToLoginLink.click();

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Reset Password - Set New Password', () => {
    const validToken = 'valid-reset-token-123';
    const expiredToken = 'expired-reset-token-456';

    test('should display reset password form with valid token', async ({ resetPasswordPage, page }) => {
      // Mock token validation
      await page.route('**/api/v1/auth/verify-reset-token*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, valid: true }),
        });
      });

      await resetPasswordPage.gotoResetPassword(validToken);

      await expect(resetPasswordPage.newPasswordInput).toBeVisible();
      await expect(resetPasswordPage.submitButton).toBeVisible();
    });

    test('should reset password successfully with valid token', async ({ resetPasswordPage, page }) => {
      // Mock successful password reset
      await page.route('**/api/v1/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Пароль успешно изменён',
          }),
        });
      });

      await resetPasswordPage.gotoResetPassword(validToken);

      await resetPasswordPage.resetPassword('NewSecurePass123!', 'NewSecurePass123!');

      // Should show success and optionally redirect to login
      const successVisible = await resetPasswordPage.successMessage.isVisible().catch(() => false);
      const redirectedToLogin = page.url().includes('/login');

      expect(successVisible || redirectedToLogin).toBe(true);
    });

    test('should show error for expired token', async ({ resetPasswordPage, page }) => {
      // Mock expired token response
      await page.route('**/api/v1/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_004',
              message: 'Ссылка для сброса пароля истекла',
            },
          }),
        });
      });

      await resetPasswordPage.gotoResetPassword(expiredToken);

      await resetPasswordPage.resetPassword('NewSecurePass123!');

      await resetPasswordPage.expectError(/истек|expired|недействительн/i);
    });

    test('should show error for invalid token', async ({ resetPasswordPage, page }) => {
      // Mock invalid token response
      await page.route('**/api/v1/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_005',
              message: 'Недействительная ссылка для сброса пароля',
            },
          }),
        });
      });

      await resetPasswordPage.gotoResetPassword('invalid-token-xxx');

      await resetPasswordPage.resetPassword('NewSecurePass123!');

      await resetPasswordPage.expectError(/недействительн|invalid|ошибк/i);
    });

    test('should show error when passwords do not match', async ({ resetPasswordPage }) => {
      await resetPasswordPage.gotoResetPassword(validToken);

      await resetPasswordPage.resetPassword('NewSecurePass123!', 'DifferentPass456!');

      await resetPasswordPage.expectError(/совпад|match/i);
    });

    test('should show error for weak password', async ({ resetPasswordPage }) => {
      await resetPasswordPage.gotoResetPassword(validToken);

      await resetPasswordPage.resetPassword('weak');

      await resetPasswordPage.expectError(/пароль|password|символ|длин/i);
    });

    test('should show error for password without uppercase', async ({ resetPasswordPage, page }) => {
      await page.route('**/api/v1/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'VAL_001',
              message: 'Пароль должен содержать заглавную букву',
            },
          }),
        });
      });

      await resetPasswordPage.gotoResetPassword(validToken);

      await resetPasswordPage.resetPassword('weakpassword123!');

      await resetPasswordPage.expectError(/заглавн|uppercase|пароль/i);
    });
  });

  test.describe('Token Handling', () => {
    test('should handle missing token gracefully', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');

      // Should show error or redirect
      const url = page.url();
      const hasError = await page.locator('[role="alert"], .error-message').isVisible().catch(() => false);
      const redirectedAway = !url.includes('/reset-password');

      expect(hasError || redirectedAway).toBe(true);
    });

    test('should handle used token', async ({ resetPasswordPage, page }) => {
      // Mock already used token
      await page.route('**/api/v1/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'AUTH_006',
              message: 'Ссылка для сброса пароля уже была использована',
            },
          }),
        });
      });

      await resetPasswordPage.gotoResetPassword('used-token-789');

      await resetPasswordPage.resetPassword('NewSecurePass123!');

      await resetPasswordPage.expectError(/использован|already used|недействительн/i);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting on forgot password', async ({ resetPasswordPage, page }) => {
      // Mock rate limit response
      await page.route('**/api/v1/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'RATE_001',
              message: 'Слишком много запросов. Подождите 5 минут.',
            },
          }),
        });
      });

      await resetPasswordPage.requestPasswordReset(TEST_USERS.user.email);

      await resetPasswordPage.expectError(/много запросов|подождите|rate limit|too many/i);
    });
  });

  test.describe('Navigation Flow', () => {
    test('should complete full password reset flow', async ({ page }) => {
      // Step 1: Navigate to forgot password from login
      await page.goto('/login');
      await page.click('a:has-text("Забыли пароль"), a:has-text("forgot")');
      await expect(page).toHaveURL(/\/forgot-password/);

      // Step 2: Request password reset
      await page.route('**/api/v1/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.click('button[type="submit"]');

      // Step 3: Simulate clicking email link (navigate to reset page with token)
      await page.route('**/api/v1/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/reset-password?token=valid-token-123');

      // Step 4: Set new password
      await page.fill('input[name="password"], input[name="newPassword"]', 'NewSecurePass123!');

      const confirmInput = page.locator('input[name="confirmPassword"], input[name="passwordConfirm"]');
      if (await confirmInput.isVisible()) {
        await confirmInput.fill('NewSecurePass123!');
      }

      await page.click('button[type="submit"]');

      // Step 5: Should redirect to login or show success
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const successMessage = page.locator('.success-message, [data-testid="success-message"]');
      const onLogin = url.includes('/login');
      const hasSuccess = await successMessage.isVisible().catch(() => false);

      expect(onLogin || hasSuccess).toBe(true);
    });
  });

  test.describe('Email Instructions', () => {
    test('should display helpful instructions', async ({ resetPasswordPage }) => {
      await resetPasswordPage.gotoForgotPassword();

      // Should have some instructional text
      const instructions = resetPasswordPage.page.locator('p, .instructions, .help-text');
      const hasInstructions = await instructions.first().isVisible().catch(() => false);

      // Page should provide guidance
      const pageContent = await resetPasswordPage.page.textContent('body');
      const hasHelpfulText =
        pageContent?.includes('email') ||
        pageContent?.includes('почт') ||
        pageContent?.includes('ссылк') ||
        pageContent?.includes('письмо');

      expect(hasHelpfulText).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard', async ({ resetPasswordPage }) => {
      await resetPasswordPage.gotoForgotPassword();

      // Tab to email input
      await resetPasswordPage.page.keyboard.press('Tab');
      await resetPasswordPage.page.keyboard.type(TEST_USERS.user.email);

      // Tab to submit
      await resetPasswordPage.page.keyboard.press('Tab');

      // Verify focus is on submit button
      const focusedElement = await resetPasswordPage.page.evaluate(
        () => document.activeElement?.tagName.toLowerCase()
      );

      expect(['button', 'input']).toContain(focusedElement);
    });

    test('should have proper form labels', async ({ resetPasswordPage }) => {
      await resetPasswordPage.gotoForgotPassword();

      // Email input should have label
      const emailInput = resetPasswordPage.emailInput;
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const labelFor = await resetPasswordPage.page.locator('label[for="email"]').isVisible().catch(() => false);
      const placeholder = await emailInput.getAttribute('placeholder');

      // At least one accessibility feature should be present
      expect(ariaLabel || labelFor || placeholder).toBeTruthy();
    });
  });

  test.describe('Security', () => {
    test('should not expose token in page content', async ({ resetPasswordPage, page }) => {
      const token = 'secret-token-12345';
      await resetPasswordPage.gotoResetPassword(token);

      // Token should not be visible in the page content (except URL)
      const bodyText = await page.locator('body').textContent();

      // Token should not appear in visible page content
      expect(bodyText).not.toContain(token);
    });

    test('should use POST method for password reset', async ({ resetPasswordPage, page }) => {
      let requestMethod = '';

      await page.route('**/api/v1/auth/reset-password', async (route, request) => {
        requestMethod = request.method();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await resetPasswordPage.gotoResetPassword('token-123');
      await resetPasswordPage.resetPassword('NewSecurePass123!');

      expect(requestMethod).toBe('POST');
    });
  });
});
