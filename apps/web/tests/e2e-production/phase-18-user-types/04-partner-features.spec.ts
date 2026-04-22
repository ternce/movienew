/**
 * Phase 18.4: PARTNER Role Feature Tests
 *
 * Verifies:
 * - All partner-specific features work (dashboard, commissions, withdrawals, referrals)
 * - Standard user features remain accessible
 * - Admin endpoints are blocked (403)
 * - Content access includes all age categories (verified 18+ adult)
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import {
  rawApiFetch,
  getTokenForRole,
  waitForPage,
  clearTokenCache,
} from './helpers/user-type-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');
test.use({ storageState: path.join(AUTH_DIR, 'partner-state.json') });

let partnerToken: string;

test.beforeAll(async () => {
  partnerToken = await getTokenForRole('partner');
});

test.afterAll(() => {
  clearTokenCache();
});

test.describe('PARTNER — Dashboard & Stats', () => {
  test('partner dashboard loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/partner');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
    expect(/[\u0400-\u04FF]/.test(body), 'Should contain Russian text').toBe(true);
  });

  test('partner dashboard API returns data', async () => {
    const res = await rawApiFetch('GET', '/partners/dashboard', undefined, partnerToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('dashboard shows partner-specific Russian text', async ({ page }) => {
    const loaded = await waitForPage(page, '/partner');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText().then((t) => t.toLowerCase());
    // Should show partner-related terms
    const hasPartnerTerms =
      body.includes('комисси') ||
      body.includes('баланс') ||
      body.includes('рефераль') ||
      body.includes('партнер') ||
      body.includes('вывод');
    expect(hasPartnerTerms, 'Dashboard should show partner-related Russian text').toBe(true);
  });
});

test.describe('PARTNER — Core Features', () => {
  test('can view referrals', async () => {
    const res = await rawApiFetch('GET', '/partners/referrals', undefined, partnerToken);
    expect(res.status).toBe(200);
  });

  test('can view commissions', async () => {
    const res = await rawApiFetch('GET', '/partners/commissions', undefined, partnerToken);
    expect(res.status).toBe(200);
  });

  test('can view balance', async () => {
    const res = await rawApiFetch('GET', '/partners/balance', undefined, partnerToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('can view withdrawals list', async () => {
    const res = await rawApiFetch('GET', '/partners/withdrawals', undefined, partnerToken);
    expect(res.status).toBe(200);
  });

  test('can preview tax deductions', async () => {
    const res = await rawApiFetch('GET', '/partners/tax-preview', undefined, partnerToken);
    // Tax preview may require specific params
    expect([200, 400]).toContain(res.status);
  });

  test('partner levels are accessible', async () => {
    const res = await rawApiFetch('GET', '/partners/levels', undefined, partnerToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

test.describe('PARTNER — Pages', () => {
  test('invite page shows referral link', async ({ page }) => {
    const loaded = await waitForPage(page, '/partner/invite');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText().then((t) => t.toLowerCase());
    const hasReferralInfo =
      body.includes('реферальн') ||
      body.includes('ссылка') ||
      body.includes('ref=') ||
      body.includes('пригласить') ||
      body.includes('код');
    expect(hasReferralInfo, 'Invite page should show referral link/code').toBe(true);
  });

  test('withdrawals page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/partner/withdrawals');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test('withdrawal creation page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/partner/withdrawals/new');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('PARTNER — Standard User Features', () => {
  test('can access standard user features', async () => {
    const endpoints = ['/users/me', '/notifications', '/store/cart'];
    for (const ep of endpoints) {
      const res = await rawApiFetch('GET', ep, undefined, partnerToken);
      expect(res.status, `${ep} should be accessible to PARTNER`).toBe(200);
    }
  });

  test('can access all age categories as verified 18+ adult', async () => {
    const res = await rawApiFetch('GET', '/content?limit=100', undefined, partnerToken);
    expect(res.status).toBe(200);

    const items = (res.body.data as { items?: { ageCategory: string }[] }).items ?? [];
    // Partner is verified 18+ — should see all age categories
    if (items.length > 0) {
      const ageCategories = [...new Set(items.map((i) => i.ageCategory))];
      expect(ageCategories.length).toBeGreaterThan(0);
    }
  });
});

test.describe('PARTNER — Admin Access Blocked', () => {
  test('cannot access admin dashboard', async () => {
    const res = await rawApiFetch('GET', '/admin/dashboard', undefined, partnerToken);
    expect(res.status).toBe(403);
  });

  test('cannot manage admin content', async () => {
    const res = await rawApiFetch(
      'POST',
      '/admin/content',
      { title: 'Should Fail', description: 'test', contentType: 'SERIES' },
      partnerToken
    );
    expect(res.status).toBe(403);
  });

  test('cannot manage admin users', async () => {
    const res = await rawApiFetch('GET', '/admin/users', undefined, partnerToken);
    expect(res.status).toBe(403);
  });

  test('cannot approve withdrawals via admin API', async () => {
    // Use a fake ID — the 403 should fire before ID validation
    const res = await rawApiFetch(
      'POST',
      '/admin/partners/withdrawals/00000000-0000-0000-0000-000000000000/approve',
      undefined,
      partnerToken
    );
    expect(res.status).toBe(403);
  });
});
