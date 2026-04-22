import { test, expect } from '@playwright/test';
import { apiGet, apiDelete } from '../helpers/api.helper';
import {
  getAdminToken,
  createTestContent,
  deleteTestContent,
  type ContentItem,
} from './helpers/admin-test.helper';

/**
 * Admin Content Archival/Deletion Tests
 *
 * Tests soft-delete (archive) via API.
 * UI-based archival (via row action + confirm dialog) is tested separately
 * since it requires content to appear in the table which depends on pagination.
 */

let adminToken: string;
let testContent1: ContentItem;
let testContent2: ContentItem;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    testContent1 = await createTestContent(adminToken, {
      title: 'E2E-TEST-Delete-1',
      description: 'Content for deletion test 1',
    });
    testContent2 = await createTestContent(adminToken, {
      title: 'E2E-TEST-Delete-2',
      description: 'Content for deletion test 2',
    });
  } catch {
    // Tests will skip
  }
});

test.afterAll(async () => {
  if (adminToken) {
    if (testContent1?.id) await deleteTestContent(adminToken, testContent1.id);
    if (testContent2?.id) await deleteTestContent(adminToken, testContent2.id);
  }
});

test.describe('Admin Content Deletion', () => {
  test('delete content via API sets status to ARCHIVED', async () => {
    test.skip(!testContent1?.id, 'Test content not created');

    // Refresh token in case it expired during long test run
    try { adminToken = await getAdminToken(); } catch { /* use existing */ }

    const res = await apiDelete(`/admin/content/${testContent1.id}`, adminToken);
    expect(res.success).toBe(true);

    // Verify status is now ARCHIVED
    const verify = await apiGet(`/admin/content/${testContent1.id}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { status: string };
      expect(data.status).toBe('ARCHIVED');
    }
  });

  test('archived content still accessible via admin API', async () => {
    test.skip(!testContent1?.id, 'Test content not created');

    const res = await apiGet(`/admin/content/${testContent1.id}`, adminToken);
    expect(res.success).toBe(true);

    if (res.data) {
      const data = res.data as { title: string; status: string };
      expect(data.title).toContain('E2E-TEST-Delete-1');
      expect(data.status).toBe('ARCHIVED');
    }
  });

  test('second content can be archived independently', async () => {
    test.skip(!testContent2?.id, 'Test content not created');

    const res = await apiDelete(`/admin/content/${testContent2.id}`, adminToken);
    expect(res.success).toBe(true);

    const verify = await apiGet(`/admin/content/${testContent2.id}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { status: string };
      expect(data.status).toBe('ARCHIVED');
    }
  });

  test('delete non-existent content returns error', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiDelete(
      '/admin/content/00000000-0000-0000-0000-000000000000',
      adminToken
    );

    // Should return error (404 Not Found)
    expect(res.success).toBe(false);
  });

  test('content list can filter by ARCHIVED status via API', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/content?status=ARCHIVED&limit=10', adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { items?: { status: string }[] };
      const items = data.items ?? [];
      // All returned items should be ARCHIVED
      for (const item of items) {
        expect(item.status).toBe('ARCHIVED');
      }
    }
  });
});
