import { type Page } from '@playwright/test';
import { apiPost } from './api.helper';

/**
 * Production test user credentials (from seed.ts)
 */
export const PROD_USERS = {
  user: {
    email: 'user@movieplatform.local',
    password: 'user123',
    firstName: 'Иван',
    lastName: 'Петров',
    role: 'BUYER',
  },
  partner: {
    email: 'partner@movieplatform.local',
    password: 'partner123',
    firstName: 'Партнер',
    lastName: 'Программы',
    role: 'PARTNER',
  },
  admin: {
    email: 'admin@movieplatform.local',
    password: 'admin123',
    firstName: 'Админ',
    lastName: 'Платформы',
    role: 'ADMIN',
  },
  minor: {
    email: 'minor@movieplatform.local',
    password: 'minor123',
    firstName: 'Алексей',
    lastName: 'Сидоров',
    role: 'MINOR',
  },
  moderator: {
    email: 'moderator@movieplatform.local',
    password: 'mod123',
    firstName: 'Модератор',
    lastName: 'Контента',
    role: 'MODERATOR',
  },
} as const;

export type ProdUserRole = keyof typeof PROD_USERS;

/**
 * Check if the given credentials are valid on production.
 * Returns true if login succeeds, false otherwise.
 * Use this to skip tests that require auth when seed users don't exist.
 */
export async function canLoginViaApi(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const res = await apiPost('/auth/login', { email, password });
    return res.success === true && !!res.data;
  } catch {
    return false;
  }
}

/**
 * Login via real API (POST /api/v1/auth/login).
 * Returns { accessToken, refreshToken, user }.
 */
export async function loginViaApi(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: unknown }> {
  const res = await apiPost('/auth/login', { email, password });

  if (!res.success || !res.data) {
    throw new Error(`API login failed for ${email}: ${JSON.stringify(res)}`);
  }

  return res.data as { accessToken: string; refreshToken: string; user: unknown };
}

/**
 * Refresh access token using refresh token (avoids rate-limited /auth/login).
 * Falls back to loginViaApi if refresh fails.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await apiPost('/auth/refresh', { refreshToken });
  if (!res.success || !res.data) {
    throw new Error(`Token refresh failed: ${JSON.stringify(res)}`);
  }
  return res.data as { accessToken: string; refreshToken: string };
}

/**
 * Login via UI — fill form and submit on production.
 * Waits for redirect away from /login.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 20_000,
  });
}

/**
 * Save browser auth state (cookies + localStorage) to a JSON file.
 */
export async function saveAuthState(
  page: Page,
  outputPath: string
): Promise<void> {
  await page.context().storageState({ path: outputPath });
}

/**
 * Check if the page is currently authenticated by inspecting localStorage.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const data = localStorage.getItem('mp-auth-storage');
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return parsed?.state?.isAuthenticated === true;
    } catch {
      return false;
    }
  });
}

/**
 * Perform a full login via UI and save state to a file.
 * Used in global-setup to prepare auth state for test projects.
 */
export async function loginAndSaveState(
  page: Page,
  email: string,
  password: string,
  outputPath: string
): Promise<void> {
  await loginViaUI(page, email, password);
  await saveAuthState(page, outputPath);
}
