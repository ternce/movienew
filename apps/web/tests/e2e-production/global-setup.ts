import type { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PROD_USERS, loginViaApi } from './helpers/auth.helper';
import { clearCart, markAllNotificationsRead } from './helpers/cleanup.helper';

const AUTH_DIR = path.join(__dirname, 'reports', '.auth');

/**
 * Build a Playwright storageState JSON object from API auth tokens.
 * This avoids flaky browser-based login and is much faster.
 */
function buildStorageState(
  baseURL: string,
  accessToken: string,
  refreshToken: string,
  user: unknown
) {
  const domain = new URL(baseURL).hostname;
  const origin = baseURL.replace(/\/$/, '');

  const authStorage = JSON.stringify({
    state: {
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    },
    version: 0,
  });

  return {
    cookies: [
      {
        name: 'mp-auth-token',
        value: accessToken,
        domain,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
      {
        name: 'mp-authenticated',
        value: 'true',
        domain,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: 'mp-auth-storage',
            value: authStorage,
          },
        ],
      },
    ],
  };
}

/**
 * Global setup: authenticate all test users via API and save browser state.
 * This runs once before the entire test suite.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://89.108.66.37';

  // Ensure auth directory exists
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Login each user role via API and save state
  const roles: Array<{ key: keyof typeof PROD_USERS; file: string }> = [
    { key: 'user', file: 'user-state.json' },
    { key: 'partner', file: 'partner-state.json' },
    { key: 'admin', file: 'admin-state.json' },
    { key: 'minor', file: 'minor-state.json' },
    { key: 'moderator', file: 'moderator-state.json' },
  ];

  for (const { key, file } of roles) {
    const user = PROD_USERS[key];
    const outputPath = path.join(AUTH_DIR, file);

    console.log(`[global-setup] Logging in as ${key} (${user.email}) via API...`);

    let loginSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const auth = await loginViaApi(user.email, user.password);
        const state = buildStorageState(
          baseURL,
          auth.accessToken,
          auth.refreshToken,
          auth.user
        );

        fs.writeFileSync(outputPath, JSON.stringify(state, null, 2));
        console.log(`[global-setup] Saved auth state for ${key} -> ${file}`);
        loginSuccess = true;
        break;
      } catch (err) {
        if (attempt < 2) {
          const delay = 3000 * (attempt + 1);
          console.warn(`[global-setup] Login attempt ${attempt + 1} failed for ${key}, retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          console.error(`[global-setup] Failed to login as ${key} after 3 attempts:`, err);
        }
      }
    }

    if (!loginSuccess) {
      // Create empty state so Playwright doesn't crash
      fs.writeFileSync(
        outputPath,
        JSON.stringify({ cookies: [], origins: [] })
      );
    }
  }

  // Pre-clean test data using API tokens
  console.log('[global-setup] Pre-cleaning test data...');
  try {
    const userAuth = await loginViaApi(
      PROD_USERS.user.email,
      PROD_USERS.user.password
    );
    await clearCart(userAuth.accessToken);
    await markAllNotificationsRead(userAuth.accessToken);
  } catch (err) {
    console.warn('[global-setup] Pre-clean failed (non-fatal):', err);
  }

  console.log('[global-setup] Done.');
}

export default globalSetup;
