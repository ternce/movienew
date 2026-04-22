/**
 * Phase 18.5: MODERATOR Role Scope Tests
 *
 * Verifies:
 * - Can access shared admin endpoints (content, store, payments, partners, verifications, docs, audit)
 * - Can perform content CRUD operations
 * - BLOCKED from ADMIN-ONLY endpoints (users, bonuses, subscription extend/cancel)
 * - Can also access regular user features
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import {
  rawApiFetch,
  getTokenForRole,
  waitForPage,
  clearTokenCache,
  ROLE_TEST_PREFIX,
} from './helpers/user-type-test.helper';
import { getFirstCategoryId } from '../phase-8-admin/helpers/admin-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');
test.use({ storageState: path.join(AUTH_DIR, 'moderator-state.json') });

let modToken: string;
let testContentId: string | null = null;

test.beforeAll(async () => {
  modToken = await getTokenForRole('moderator');
});

test.afterAll(async () => {
  // Cleanup test content
  if (testContentId) {
    try {
      await rawApiFetch('DELETE', `/admin/content/${testContentId}`, undefined, modToken);
    } catch {
      // Non-critical
    }
  }
  clearTokenCache();
});

test.describe('MODERATOR — Shared Admin Access (ALLOWED)', () => {
  test('can access admin dashboard', async () => {
    const res = await rawApiFetch('GET', '/admin/dashboard', undefined, modToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('can access admin dashboard stats', async () => {
    const res = await rawApiFetch('GET', '/admin/dashboard/stats', undefined, modToken);
    expect(res.status).toBe(200);
  });

  test('admin dashboard page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
    expect(/[\u0400-\u04FF]/.test(body), 'Should contain Russian text').toBe(true);
  });

  test('can list admin content', async () => {
    const res = await rawApiFetch('GET', '/admin/content', undefined, modToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('can list admin store products', async () => {
    const res = await rawApiFetch('GET', '/admin/store/products', undefined, modToken);
    expect(res.status).toBe(200);
  });

  test('can view admin payments', async () => {
    const res = await rawApiFetch('GET', '/admin/payments/transactions', undefined, modToken);
    expect(res.status).toBe(200);
  });

  test('can view admin partners', async () => {
    const res = await rawApiFetch('GET', '/admin/partners', undefined, modToken);
    expect(res.status).toBe(200);
  });

  test('can view admin verifications', async () => {
    const res = await rawApiFetch('GET', '/admin/verifications', undefined, modToken);
    expect(res.status).toBe(200);
  });

  test('can view admin documents', async () => {
    const res = await rawApiFetch('GET', '/admin/documents', undefined, modToken);
    expect(res.status).toBe(200);
  });

  test('can view audit logs', async () => {
    const res = await rawApiFetch('GET', '/admin/audit', undefined, modToken);
    expect(res.status).toBe(200);
  });
});

test.describe('MODERATOR — Content CRUD', () => {
  test('can create test content', async () => {
    let categoryId: string;
    try {
      categoryId = await getFirstCategoryId(modToken);
    } catch {
      test.skip(true, 'No categories available');
      return;
    }

    const timestamp = Date.now().toString(36);
    const res = await rawApiFetch(
      'POST',
      '/admin/content',
      {
        title: `${ROLE_TEST_PREFIX}ModTest-${timestamp}`,
        description: 'Moderator content creation test',
        contentType: 'SERIES',
        categoryId,
        ageCategory: 'ZERO_PLUS',
        isFree: true,
      },
      modToken
    );

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);

    const created = res.body.data as { id: string };
    testContentId = created.id;
  });

  test('can update test content', async () => {
    test.skip(!testContentId, 'No test content to update');

    const res = await rawApiFetch(
      'PATCH',
      `/admin/content/${testContentId}`,
      { description: 'Updated by moderator' },
      modToken
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('can delete test content', async () => {
    test.skip(!testContentId, 'No test content to delete');

    const res = await rawApiFetch(
      'DELETE',
      `/admin/content/${testContentId}`,
      undefined,
      modToken
    );
    expect([200, 204]).toContain(res.status);
    testContentId = null; // Prevent double-delete in afterAll
  });
});

test.describe('MODERATOR — ADMIN-ONLY Endpoints BLOCKED', () => {
  test('cannot list users (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch('GET', '/admin/users', undefined, modToken);
    expect(res.status).toBe(403);
  });

  test('cannot change user roles (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch(
      'PATCH',
      '/admin/users/00000000-0000-0000-0000-000000000000/role',
      { role: 'BUYER' },
      modToken
    );
    expect(res.status).toBe(403);
  });

  test('cannot deactivate users (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch(
      'POST',
      '/admin/users/00000000-0000-0000-0000-000000000000/deactivate',
      undefined,
      modToken
    );
    expect(res.status).toBe(403);
  });

  test('cannot manage bonus rates (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch('GET', '/admin/bonuses/rates', undefined, modToken);
    expect(res.status).toBe(403);
  });

  test('cannot manage bonus campaigns (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch('GET', '/admin/bonuses/campaigns', undefined, modToken);
    expect(res.status).toBe(403);
  });

  test('cannot adjust user bonuses (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch(
      'POST',
      '/admin/bonuses/users/00000000-0000-0000-0000-000000000000/adjust',
      { amount: 100, reason: 'test' },
      modToken
    );
    expect(res.status).toBe(403);
  });

  test('cannot extend subscriptions (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch(
      'PATCH',
      '/admin/subscriptions/00000000-0000-0000-0000-000000000000/extend',
      { days: 30 },
      modToken
    );
    expect(res.status).toBe(403);
  });

  test('cannot cancel subscriptions (ADMIN-ONLY)', async () => {
    const res = await rawApiFetch(
      'POST',
      '/admin/subscriptions/00000000-0000-0000-0000-000000000000/cancel',
      undefined,
      modToken
    );
    expect(res.status).toBe(403);
  });
});

test.describe('MODERATOR — UI Pages', () => {
  test('admin content page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test('admin navigation shows accessible sections', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    // Check sidebar has links to allowed sections
    const sidebar = page.locator('aside, nav, [role="navigation"]');
    if ((await sidebar.count()) > 0) {
      const text = await sidebar.first().innerText();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

test.describe('MODERATOR — Regular User Features', () => {
  test('can access own profile and notifications', async () => {
    const profileRes = await rawApiFetch('GET', '/users/me', undefined, modToken);
    expect(profileRes.status).toBe(200);

    const user = profileRes.body.data as { role: string };
    expect(user.role).toBe('MODERATOR');

    const notifRes = await rawApiFetch('GET', '/notifications', undefined, modToken);
    expect(notifRes.status).toBe(200);
  });
});
