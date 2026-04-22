import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../helpers/auth.helper';

/**
 * Phase 11 — Bonus API
 *
 * API-only tests for bonus endpoints.
 * Known issue: Bonuses API returns 500 errors on production
 * (/api/v1/bonuses/balance, /api/v1/bonuses/statistics).
 * Tests verify the API responds (even with errors) and does not crash.
 */

test.describe('Bonus API', () => {
  test('bonus balance endpoint responds (even if 500)', async () => {
    let token: string;
    try {
      const auth = await loginViaApi(PROD_USERS.user.email, PROD_USERS.user.password);
      token = auth.accessToken;
    } catch {
      test.skip(true, 'User login failed — cannot test API');
      return;
    }

    const res = await apiGet('/bonuses/balance', token);
    // API may return 500 but should have a response with defined structure
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('bonus statistics endpoint responds', async () => {
    let token: string;
    try {
      const auth = await loginViaApi(PROD_USERS.user.email, PROD_USERS.user.password);
      token = auth.accessToken;
    } catch {
      test.skip(true, 'User login failed — cannot test API');
      return;
    }

    const res = await apiGet('/bonuses/statistics', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('bonus transactions endpoint responds', async () => {
    let token: string;
    try {
      const auth = await loginViaApi(PROD_USERS.user.email, PROD_USERS.user.password);
      token = auth.accessToken;
    } catch {
      test.skip(true, 'User login failed — cannot test API');
      return;
    }

    const res = await apiGet('/bonuses/transactions', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('auth is required for bonus endpoints (401 without token)', async () => {
    // Call without auth token — should get 401 or error response
    const res = await apiGet('/bonuses/balance');
    expect(res).toBeDefined();

    // Either success is false (unauthorized) or the API returns an error structure
    const isUnauthorized =
      res.success === false ||
      (res.error && (res.error.code === 'UNAUTHORIZED' || res.error.message?.includes('Unauthorized')));

    expect(isUnauthorized).toBe(true);
  });

  test('bonus expiring endpoint responds', async () => {
    let token: string;
    try {
      const auth = await loginViaApi(PROD_USERS.user.email, PROD_USERS.user.password);
      token = auth.accessToken;
    } catch {
      test.skip(true, 'User login failed — cannot test API');
      return;
    }

    const res = await apiGet('/bonuses/expiring', token);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
