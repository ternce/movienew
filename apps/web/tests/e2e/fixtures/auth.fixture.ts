import { test as base, expect, type Page, type Locator } from '@playwright/test';

/**
 * Test user credentials by role
 */
export const TEST_USERS = {
  user: {
    email: 'user@test.movieplatform.ru',
    password: 'TestUser123!',
    firstName: 'Тест',
    lastName: 'Пользователь',
    ageCategory: 'ADULT' as const,
  },
  partner: {
    email: 'partner@test.movieplatform.ru',
    password: 'TestPartner123!',
    firstName: 'Тест',
    lastName: 'Партнёр',
    referralCode: 'TESTPARTNER',
    ageCategory: 'ADULT' as const,
  },
  admin: {
    email: 'admin@test.movieplatform.ru',
    password: 'TestAdmin123!',
    firstName: 'Тест',
    lastName: 'Админ',
    ageCategory: 'ADULT' as const,
  },
  minor: {
    email: 'minor@test.movieplatform.ru',
    password: 'TestMinor123!',
    firstName: 'Тест',
    lastName: 'Несовершеннолетний',
    birthDate: '2012-01-15', // Under 18
    ageCategory: 'CHILD' as const,
  },
} as const;

export type UserRole = keyof typeof TEST_USERS;

/**
 * Login page object model
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.forgotPasswordLink = page.getByRole('link', { name: /забыли пароль/i });
    this.registerLink = page.getByRole('link', { name: /регистрация|зарегистрироваться/i });
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
    this.successMessage = page.locator('[data-testid="success-message"], .success-message');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForRedirect(email: string, password: string, expectedUrl = '/') {
    await this.login(email, password);
    await this.page.waitForURL(expectedUrl);
  }

  async expectError(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectSuccess(message?: string | RegExp) {
    await expect(this.successMessage).toBeVisible();
    if (message) {
      await expect(this.successMessage).toContainText(message);
    }
  }
}

/**
 * Registration page object model
 */
export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly birthDateInput: Locator;
  readonly referralCodeInput: Locator;
  readonly acceptTermsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="passwordConfirm"]');
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.birthDateInput = page.locator('input[name="birthDate"], input[type="date"]');
    this.referralCodeInput = page.locator('input[name="referralCode"]');
    this.acceptTermsCheckbox = page.locator('input[name="acceptTerms"], input[type="checkbox"]').first();
    this.submitButton = page.locator('button[type="submit"]');
    this.loginLink = page.getByRole('link', { name: /войти|вход/i });
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
    this.successMessage = page.locator('[data-testid="success-message"], .success-message');
    this.fieldErrors = page.locator('[data-testid="field-error"], .field-error, [aria-invalid="true"] ~ .error');
  }

  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  async fillRegistrationForm(data: {
    email: string;
    password: string;
    confirmPassword?: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    referralCode?: string;
    acceptTerms?: boolean;
  }) {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(data.confirmPassword || data.password);
    }

    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);

    if (data.birthDate && await this.birthDateInput.isVisible()) {
      await this.birthDateInput.fill(data.birthDate);
    }

    if (data.referralCode && await this.referralCodeInput.isVisible()) {
      await this.referralCodeInput.fill(data.referralCode);
    }

    if (data.acceptTerms !== false && await this.acceptTermsCheckbox.isVisible()) {
      const isChecked = await this.acceptTermsCheckbox.isChecked();
      if (!isChecked) {
        await this.acceptTermsCheckbox.check();
      }
    }
  }

  async register(data: Parameters<typeof this.fillRegistrationForm>[0]) {
    await this.fillRegistrationForm(data);
    await this.submitButton.click();
  }

  async registerAndWaitForRedirect(
    data: Parameters<typeof this.fillRegistrationForm>[0],
    expectedUrl = '/'
  ) {
    await this.register(data);
    await this.page.waitForURL(expectedUrl);
  }

  async expectError(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectFieldError(fieldName: string, message?: string | RegExp) {
    const fieldError = this.page.locator(
      `[data-testid="${fieldName}-error"], input[name="${fieldName}"] ~ .error, input[name="${fieldName}"][aria-invalid="true"] ~ *`
    );
    await expect(fieldError).toBeVisible();
    if (message) {
      await expect(fieldError).toContainText(message);
    }
  }

  async expectSuccess(message?: string | RegExp) {
    await expect(this.successMessage).toBeVisible();
    if (message) {
      await expect(this.successMessage).toContainText(message);
    }
  }
}

/**
 * Password reset page object model
 */
export class ResetPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.newPasswordInput = page.locator('input[name="password"], input[name="newPassword"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="passwordConfirm"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.backToLoginLink = page.getByRole('link', { name: /вход|войти|назад/i });
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
    this.successMessage = page.locator('[data-testid="success-message"], .success-message');
  }

  async gotoForgotPassword() {
    await this.page.goto('/forgot-password');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoResetPassword(token: string) {
    await this.page.goto(`/reset-password?token=${token}`);
    await this.page.waitForLoadState('networkidle');
  }

  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async resetPassword(newPassword: string, confirmPassword?: string) {
    await this.newPasswordInput.fill(newPassword);
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(confirmPassword || newPassword);
    }
    await this.submitButton.click();
  }

  async expectError(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectSuccess(message?: string | RegExp) {
    await expect(this.successMessage).toBeVisible();
    if (message) {
      await expect(this.successMessage).toContainText(message);
    }
  }
}

/**
 * Verify email page object model
 */
export class VerifyEmailPage {
  readonly page: Page;
  readonly spinner: Locator;
  readonly successIcon: Locator;
  readonly errorIcon: Locator;
  readonly heading: Locator;
  readonly loginLink: Locator;
  readonly message: Locator;

  constructor(page: Page) {
    this.page = page;
    this.spinner = page.locator('[class*="spinner"], [class*="animate-spin"]');
    this.successIcon = page.locator('.bg-mp-success-bg');
    this.errorIcon = page.locator('.bg-mp-error-bg');
    this.heading = page.locator('h2');
    this.loginLink = page.getByRole('link', { name: /войти|вход|аккаунт/i });
    this.message = page.locator('p');
  }

  async goto(token: string) {
    await this.page.goto(`/verify-email/${token}`);
  }
}

/**
 * Extended test fixture with auth helpers
 */
interface AuthFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  resetPasswordPage: ResetPasswordPage;
  verifyEmailPage: VerifyEmailPage;
  loginAsUser: (role: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: () => Promise<boolean>;
  getCurrentUser: () => Promise<{ email: string } | null>;
}

/**
 * Create extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  resetPasswordPage: async ({ page }, use) => {
    await use(new ResetPasswordPage(page));
  },

  verifyEmailPage: async ({ page }, use) => {
    await use(new VerifyEmailPage(page));
  },

  loginAsUser: async ({ page }, use) => {
    const login = async (role: UserRole) => {
      const user = TEST_USERS[role];
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(user.email, user.password);
    };
    await use(login);
  },

  loginWithCredentials: async ({ page }, use) => {
    const login = async (email: string, password: string) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(email, password);
    };
    await use(login);
  },

  logout: async ({ page }, use) => {
    const logout = async () => {
      // Try to find and click logout button/link
      const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Выйти"), a:has-text("Выйти")');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL('/login');
      } else {
        // Fallback: navigate to logout endpoint or clear storage
        await page.goto('/logout');
      }
    };
    await use(logout);
  },

  isLoggedIn: async ({ page }, use) => {
    const check = async (): Promise<boolean> => {
      // Check for auth storage in localStorage
      const storage = await page.evaluate(() => {
        const data = localStorage.getItem('mp-auth-storage');
        if (!data) return null;
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      });
      return storage?.state?.isAuthenticated === true;
    };
    await use(check);
  },

  getCurrentUser: async ({ page }, use) => {
    const getUser = async () => {
      const storage = await page.evaluate(() => {
        const data = localStorage.getItem('mp-auth-storage');
        if (!data) return null;
        try {
          const parsed = JSON.parse(data);
          return parsed?.state?.user || null;
        } catch {
          return null;
        }
      });
      return storage;
    };
    await use(getUser);
  },
});

export { expect };

/**
 * Generate unique email for registration tests
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@test.movieplatform.ru`;
}

/**
 * Generate valid birth date for age testing
 */
export function generateBirthDate(age: number): string {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${birthYear}-${month}-${day}`;
}

/**
 * Mock auth API responses for isolated tests
 */
export async function mockAuthApi(page: Page, scenario: 'success' | 'invalid_credentials' | 'duplicate_email' | 'server_error') {
  const responses: Record<string, { status: number; body: unknown }> = {
    success: {
      status: 200,
      body: {
        success: true,
        data: {
          user: TEST_USERS.user,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      },
    },
    invalid_credentials: {
      status: 401,
      body: {
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Неверный email или пароль',
        },
      },
    },
    duplicate_email: {
      status: 409,
      body: {
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'Пользователь с таким email уже существует',
        },
      },
    },
    server_error: {
      status: 500,
      body: {
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Внутренняя ошибка сервера',
        },
      },
    },
  };

  const response = responses[scenario];

  await page.route('**/api/v1/auth/**', async (route) => {
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

/**
 * Wait for authentication to complete after login
 */
export async function waitForAuth(page: Page, timeout = 10000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isLoggedIn = await page.evaluate(() => {
      const data = localStorage.getItem('mp-auth-storage');
      if (!data) return false;
      try {
        const parsed = JSON.parse(data);
        return parsed?.state?.isAuthenticated === true;
      } catch {
        return false;
      }
    });

    if (isLoggedIn) return true;
    await page.waitForTimeout(100);
  }

  return false;
}
