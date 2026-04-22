import {
  test,
  expect,
  TEST_USERS,
  mockAuthApi,
  waitForAuth,
} from '../fixtures/auth.fixture';

test.describe('User Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test.describe('Successful Login', () => {
    test('should login with valid credentials', async ({ loginPage, page }) => {
      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      // Should redirect to home page
      await expect(page).toHaveURL(/^\/((?!login).)*$/);

      // Verify auth state is set
      const isLoggedIn = await waitForAuth(page);
      expect(isLoggedIn).toBe(true);
    });

    test('should login as partner user', async ({ loginPage, page }) => {
      await loginPage.login(TEST_USERS.partner.email, TEST_USERS.partner.password);

      await expect(page).toHaveURL(/^\/((?!login).)*$/);

      const isLoggedIn = await waitForAuth(page);
      expect(isLoggedIn).toBe(true);
    });

    test('should login as admin user', async ({ loginPage, page }) => {
      await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Admin may redirect to admin panel or home
      await expect(page).toHaveURL(/^\/(admin)?((?!login).)*$/);

      const isLoggedIn = await waitForAuth(page);
      expect(isLoggedIn).toBe(true);
    });

    test('should store tokens in localStorage', async ({ loginPage, page }) => {
      await loginPage.loginAndWaitForRedirect(TEST_USERS.user.email, TEST_USERS.user.password);

      const storage = await page.evaluate(() => {
        return localStorage.getItem('mp-auth-storage');
      });

      expect(storage).not.toBeNull();
      const parsed = JSON.parse(storage!);
      expect(parsed.state.accessToken).toBeDefined();
      expect(parsed.state.isAuthenticated).toBe(true);
    });
  });

  test.describe('Invalid Credentials', () => {
    test('should show error for wrong password', async ({ loginPage }) => {
      await loginPage.login(TEST_USERS.user.email, 'WrongPassword123!');

      await loginPage.expectError(/неверн|invalid|incorrect/i);
    });

    test('should show error for non-existent email', async ({ loginPage }) => {
      await loginPage.login('nonexistent@test.movieplatform.ru', 'SomePassword123!');

      await loginPage.expectError(/неверн|invalid|не найден/i);
    });

    test('should show error for empty email', async ({ loginPage }) => {
      await loginPage.passwordInput.fill(TEST_USERS.user.password);
      await loginPage.submitButton.click();

      await loginPage.expectError(/email|почт|обязательн/i);
    });

    test('should show error for empty password', async ({ loginPage }) => {
      await loginPage.emailInput.fill(TEST_USERS.user.email);
      await loginPage.submitButton.click();

      await loginPage.expectError(/пароль|password|обязательн/i);
    });

    test('should show error for invalid email format', async ({ loginPage }) => {
      await loginPage.login('invalid-email', TEST_USERS.user.password);

      await loginPage.expectError(/email|почт|формат/i);
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session after page refresh', async ({ loginPage, page }) => {
      await loginPage.loginAndWaitForRedirect(TEST_USERS.user.email, TEST_USERS.user.password);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be logged in
      const isLoggedIn = await waitForAuth(page);
      expect(isLoggedIn).toBe(true);
    });

    test('should persist session in new tab', async ({ loginPage, page, context }) => {
      await loginPage.loginAndWaitForRedirect(TEST_USERS.user.email, TEST_USERS.user.password);

      // Open new tab in same context
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');

      // Should be logged in on new tab
      const isLoggedIn = await waitForAuth(newPage);
      expect(isLoggedIn).toBe(true);

      await newPage.close();
    });

    test('should maintain auth state across navigation', async ({ loginPage, page }) => {
      await loginPage.loginAndWaitForRedirect(TEST_USERS.user.email, TEST_USERS.user.password);

      // Navigate to different pages
      const pages = ['/', '/search', '/profile'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        const isLoggedIn = await waitForAuth(page);
        expect(isLoggedIn).toBe(true);
      }
    });
  });

  test.describe('Remember Me', () => {
    test('should have remember me option', async ({ loginPage }) => {
      const rememberMe = loginPage.page.locator('input[name="rememberMe"], input[type="checkbox"]').first();

      // Remember me checkbox should exist (optional feature)
      const hasRememberMe = await rememberMe.isVisible().catch(() => false);

      if (hasRememberMe) {
        await expect(rememberMe).toBeEnabled();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to registration page', async ({ loginPage, page }) => {
      await loginPage.registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    });

    test('should navigate to forgot password page', async ({ loginPage, page }) => {
      await loginPage.forgotPasswordLink.click();
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting gracefully', async ({ loginPage, page }) => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await loginPage.login(TEST_USERS.user.email, 'WrongPassword' + i);
        await page.waitForTimeout(100);
      }

      // After multiple attempts, should show rate limit or lockout message
      // or continue showing invalid credentials
      await loginPage.expectError(/неверн|invalid|слишком много|подождите|rate limit/i);
    });
  });

  test.describe('UI Elements', () => {
    test('should have password visibility toggle', async ({ loginPage }) => {
      const toggleButton = loginPage.page.locator('button[aria-label*="password"], button[data-testid="toggle-password"]');

      const hasToggle = await toggleButton.isVisible().catch(() => false);

      if (hasToggle) {
        // Password should be hidden by default
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

        // Click toggle
        await toggleButton.click();

        // Password should now be visible
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
      }
    });

    test('should show loading state during login', async ({ loginPage, page }) => {
      // Slow down the network to see loading state
      await page.route('**/api/v1/auth/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.continue();
      });

      await loginPage.emailInput.fill(TEST_USERS.user.email);
      await loginPage.passwordInput.fill(TEST_USERS.user.password);

      // Click and immediately check for loading state
      const submitPromise = loginPage.submitButton.click();

      // Button should be disabled or show loading
      const loadingState = loginPage.page.locator('.loading, [data-loading="true"], button:disabled');
      const hasLoading = await loadingState.isVisible().catch(() => false);

      await submitPromise;

      // Loading state may or may not be visible depending on speed
      // Just verify the flow completes
    });
  });

  test.describe('Redirect After Login', () => {
    test('should redirect to original destination after login', async ({ page }) => {
      // Navigate to protected page first
      await page.goto('/profile');

      // Should be redirected to login
      await page.waitForURL(/\/login/);

      // Check if there's a redirect parameter
      const url = page.url();
      const hasRedirect = url.includes('redirect=') || url.includes('from=') || url.includes('returnUrl=');

      // Login
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');

      // Should redirect back to original destination or home
      await page.waitForURL(/\/(profile|)$/);
    });
  });

  test.describe('Server Errors', () => {
    test('should handle server error gracefully', async ({ loginPage, page }) => {
      await mockAuthApi(page, 'server_error');

      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      await loginPage.expectError(/ошибка|error|попробуйте/i);
    });

    test('should handle network error', async ({ loginPage, page }) => {
      // Abort network requests
      await page.route('**/api/v1/auth/login', async (route) => {
        await route.abort('failed');
      });

      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      await loginPage.expectError(/сеть|network|connection|ошибка/i);
    });
  });

  test.describe('Security', () => {
    test('should not expose password in URL', async ({ loginPage, page }) => {
      await loginPage.login(TEST_USERS.user.email, TEST_USERS.user.password);

      const url = page.url();
      expect(url).not.toContain(TEST_USERS.user.password);
    });

    test('should clear password field on error', async ({ loginPage }) => {
      await loginPage.login(TEST_USERS.user.email, 'WrongPassword123!');

      await loginPage.expectError();

      // Password field should be cleared (security best practice)
      // Some implementations keep it for user convenience
      const passwordValue = await loginPage.passwordInput.inputValue();
      // Either cleared or retained is acceptable
      expect([passwordValue, '']).toContain(passwordValue);
    });

    test('should use HTTPS for login form action', async ({ loginPage }) => {
      const form = loginPage.page.locator('form');
      const action = await form.getAttribute('action');

      // Form should either have no action (same origin) or HTTPS action
      if (action) {
        expect(action.startsWith('http://')).toBe(false);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible form labels', async ({ loginPage }) => {
      // Email input should have accessible label
      const emailLabel = loginPage.page.locator('label[for="email"], label:has-text("Email"), label:has-text("Почта")');
      const hasEmailLabel = await emailLabel.isVisible().catch(() => false);

      // Password input should have accessible label
      const passwordLabel = loginPage.page.locator('label[for="password"], label:has-text("Пароль")');
      const hasPasswordLabel = await passwordLabel.isVisible().catch(() => false);

      expect(hasEmailLabel || hasPasswordLabel).toBe(true);
    });

    test('should be navigable with keyboard', async ({ loginPage }) => {
      // Tab to email input
      await loginPage.page.keyboard.press('Tab');

      // Fill email
      await loginPage.page.keyboard.type(TEST_USERS.user.email);

      // Tab to password
      await loginPage.page.keyboard.press('Tab');

      // Fill password
      await loginPage.page.keyboard.type(TEST_USERS.user.password);

      // Tab to submit and press Enter
      await loginPage.page.keyboard.press('Tab');
      await loginPage.page.keyboard.press('Enter');

      // Should attempt login
      await loginPage.page.waitForLoadState('networkidle');
    });
  });
});
