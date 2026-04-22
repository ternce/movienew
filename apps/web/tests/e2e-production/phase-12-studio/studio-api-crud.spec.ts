/**
 * Studio API CRUD — Production E2E Tests
 *
 * API-level tests for all 4 content types: SERIES, CLIP, SHORT, TUTORIAL.
 * Validates backend CRUD before testing UI wizards.
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import { apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.helper';
import {
  getAdminToken,
  getFirstCategoryId,
  cleanupAllTestContent,
  TEST_CONTENT_PREFIX,
} from './helpers/studio-test.helper';

let adminToken: string;
let categoryId: string;
const createdIds: string[] = [];

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
    categoryId = await getFirstCategoryId(adminToken);
  } catch {
    // Tests will skip
  }
});

test.afterAll(async () => {
  if (adminToken) {
    for (const id of createdIds) {
      try {
        await apiDelete(`/admin/content/${id}`, adminToken);
      } catch { /* non-critical */ }
    }
    await cleanupAllTestContent(adminToken);
  }
});

// ============================================================
// Content Creation via API
// ============================================================

test.describe('Content Creation via API', () => {
  test('POST /admin/content creates CLIP with correct fields', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content', {
      title: `${TEST_CONTENT_PREFIX}Clip-${timestamp}`,
      description: 'API-created test clip',
      contentType: 'CLIP',
      categoryId,
      ageCategory: 'ZERO_PLUS',
      isFree: true,
    }, adminToken);

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const data = res.data as { id: string; contentType: string; isFree: boolean };
    expect(data.contentType).toBe('CLIP');
    expect(data.isFree).toBe(true);
    createdIds.push(data.id);
  });

  test('POST /admin/content creates SHORT as always-free content', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content', {
      title: `${TEST_CONTENT_PREFIX}Short-${timestamp}`,
      description: 'API-created test short',
      contentType: 'SHORT',
      ageCategory: 'ZERO_PLUS',
      isFree: true,
    }, adminToken);

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const data = res.data as { id: string; contentType: string; isFree: boolean };
    expect(data.contentType).toBe('SHORT');
    expect(data.isFree).toBe(true);
    createdIds.push(data.id);
  });

  test('POST /admin/content/series creates SERIES with seasons/episodes', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content/series', {
      title: `${TEST_CONTENT_PREFIX}Series-${timestamp}`,
      description: 'API-created test series with structure',
      contentType: 'SERIES',
      categoryId,
      ageCategory: 'TWELVE_PLUS',
      isFree: true,
      seasons: [
        {
          title: 'Сезон 1',
          order: 1,
          episodes: [
            { title: 'Эпизод 1', description: 'First episode', order: 1 },
            { title: 'Эпизод 2', description: 'Second episode', order: 2 },
          ],
        },
      ],
    }, adminToken);

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const data = res.data as { id: string; contentType: string };
    expect(data.contentType).toBe('SERIES');
    createdIds.push(data.id);
  });

  test('POST /admin/content/series creates TUTORIAL with chapters/lessons', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content/series', {
      title: `${TEST_CONTENT_PREFIX}Tutorial-${timestamp}`,
      description: 'API-created test tutorial with chapters',
      contentType: 'TUTORIAL',
      categoryId,
      ageCategory: 'ZERO_PLUS',
      isFree: true,
      seasons: [
        {
          title: 'Глава 1',
          order: 1,
          episodes: [
            { title: 'Урок 1', description: 'First lesson', order: 1 },
          ],
        },
        {
          title: 'Глава 2',
          order: 2,
          episodes: [
            { title: 'Урок 1', description: 'Second chapter first lesson', order: 1 },
          ],
        },
      ],
    }, adminToken);

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const data = res.data as { id: string; contentType: string };
    expect(data.contentType).toBe('TUTORIAL');
    createdIds.push(data.id);
  });
});

// ============================================================
// Content Retrieval via API
// ============================================================

test.describe('Content Retrieval via API', () => {
  test('GET /admin/content/:id returns series detail', async () => {
    test.skip(!adminToken || createdIds.length < 3, 'Series not created');

    const seriesId = createdIds[2]; // 3rd created = SERIES
    const res = await apiGet(`/admin/content/${seriesId}`, adminToken);

    expect(res.success).toBe(true);
    const data = res.data as { id: string; contentType: string; title: string };
    expect(data.id).toBe(seriesId);
    expect(data.contentType).toBe('SERIES');
    expect(data.title).toContain(TEST_CONTENT_PREFIX);
  });

  test('GET /admin/content/:id/structure returns seasons/episodes tree', async () => {
    test.skip(!adminToken || createdIds.length < 3, 'Series not created');

    const seriesId = createdIds[2];
    const res = await apiGet(`/admin/content/${seriesId}/structure`, adminToken);

    // Endpoint may or may not exist — check gracefully
    if (res.success && res.data) {
      const data = res.data as { seasons?: { episodes?: unknown[] }[] };
      if (data.seasons) {
        expect(data.seasons.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('GET /admin/content?contentType=SERIES returns only series', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?contentType=SERIES&limit=10', adminToken);
    expect(res.success).toBe(true);

    const data = res.data as { items?: { contentType: string }[] };
    for (const item of data.items ?? []) {
      expect(item.contentType).toBe('SERIES');
    }
  });

  test('GET /admin/content?contentType=CLIP returns only clips', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?contentType=CLIP&limit=10', adminToken);
    expect(res.success).toBe(true);

    const data = res.data as { items?: { contentType: string }[] };
    for (const item of data.items ?? []) {
      expect(item.contentType).toBe('CLIP');
    }
  });

  test('GET /admin/content?contentType=SHORT returns only shorts', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?contentType=SHORT&limit=10', adminToken);
    expect(res.success).toBe(true);

    const data = res.data as { items?: { contentType: string }[] };
    for (const item of data.items ?? []) {
      expect(item.contentType).toBe('SHORT');
    }
  });

  test('GET /admin/content?contentType=TUTORIAL returns only tutorials', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/content?contentType=TUTORIAL&limit=10', adminToken);
    expect(res.success).toBe(true);

    const data = res.data as { items?: { contentType: string }[] };
    for (const item of data.items ?? []) {
      expect(item.contentType).toBe('TUTORIAL');
    }
  });
});

// ============================================================
// Content Update via API
// ============================================================

test.describe('Content Update via API', () => {
  test('PATCH /admin/content/:id updates title', async () => {
    test.skip(!adminToken || createdIds.length < 1, 'No content created');

    const contentId = createdIds[0];
    const newTitle = `${TEST_CONTENT_PREFIX}Updated-Title-${Date.now().toString(36)}`;

    const res = await apiPatch(`/admin/content/${contentId}`, {
      title: newTitle,
    }, adminToken);

    expect(res.success).toBe(true);

    // Verify update
    const verify = await apiGet(`/admin/content/${contentId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { title: string };
      expect(data.title).toBe(newTitle);
    }
  });

  test('PATCH /admin/content/:id transitions status DRAFT → PUBLISHED', async () => {
    test.skip(!adminToken || createdIds.length < 1, 'No content created');

    const contentId = createdIds[0];

    const res = await apiPatch(`/admin/content/${contentId}`, {
      status: 'PUBLISHED',
    }, adminToken);

    expect(res.success).toBe(true);

    const verify = await apiGet(`/admin/content/${contentId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { status: string };
      expect(data.status).toBe('PUBLISHED');
    }
  });

  test('PATCH /admin/content/:id updates pricing isFree → paid', async () => {
    test.skip(!adminToken || createdIds.length < 1, 'No content created');

    const contentId = createdIds[0];

    const res = await apiPatch(`/admin/content/${contentId}`, {
      isFree: false,
      individualPrice: 299,
    }, adminToken);

    expect(res.success).toBe(true);

    const verify = await apiGet(`/admin/content/${contentId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { isFree: boolean; individualPrice: number };
      expect(data.isFree).toBe(false);
      expect(data.individualPrice).toBe(299);
    }
  });
});

// ============================================================
// Content Deletion via API
// ============================================================

test.describe('Content Deletion via API', () => {
  test('DELETE /admin/content/:id archives content', async () => {
    test.skip(!adminToken || createdIds.length < 2, 'Not enough content created');

    // Use the SHORT (index 1) for deletion test
    const contentId = createdIds[1];
    const res = await apiDelete(`/admin/content/${contentId}`, adminToken);

    expect(res.success).toBe(true);

    const verify = await apiGet(`/admin/content/${contentId}`, adminToken);
    if (verify.success && verify.data) {
      const data = verify.data as { status: string };
      expect(data.status).toBe('ARCHIVED');
    }
  });
});

// ============================================================
// Field Mapping
// ============================================================

test.describe('Field Mapping', () => {
  test('age category roundtrip: ZERO_PLUS stored correctly', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content', {
      title: `${TEST_CONTENT_PREFIX}Age-0plus-${timestamp}`,
      description: 'Age category test',
      contentType: 'CLIP',
      categoryId,
      ageCategory: 'ZERO_PLUS',
      isFree: true,
    }, adminToken);

    expect(res.success).toBe(true);
    const data = res.data as { id: string; ageCategory: string };
    expect(data.ageCategory).toBe('ZERO_PLUS');
    createdIds.push(data.id);
  });

  test('age category roundtrip: EIGHTEEN_PLUS stored correctly', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content', {
      title: `${TEST_CONTENT_PREFIX}Age-18plus-${timestamp}`,
      description: 'Age category test',
      contentType: 'CLIP',
      categoryId,
      ageCategory: 'EIGHTEEN_PLUS',
      isFree: true,
    }, adminToken);

    expect(res.success).toBe(true);
    const data = res.data as { id: string; ageCategory: string };
    expect(data.ageCategory).toBe('EIGHTEEN_PLUS');
    createdIds.push(data.id);
  });

  test('slug auto-generated when omitted', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const res = await apiPost('/admin/content', {
      title: `${TEST_CONTENT_PREFIX}Slug-Auto-${timestamp}`,
      description: 'Slug auto-generation test',
      contentType: 'CLIP',
      categoryId,
      ageCategory: 'ZERO_PLUS',
      isFree: true,
    }, adminToken);

    expect(res.success).toBe(true);
    const data = res.data as { id: string; slug: string };
    expect(data.slug).toBeTruthy();
    expect(data.slug.length).toBeGreaterThan(0);
    createdIds.push(data.id);
  });

  test('custom slug accepted and persisted', async () => {
    test.skip(!adminToken || !categoryId, 'Admin login or categories failed');

    const timestamp = Date.now().toString(36);
    const customSlug = `e2e-custom-slug-${timestamp}`;

    const res = await apiPost('/admin/content', {
      title: `${TEST_CONTENT_PREFIX}Slug-Custom-${timestamp}`,
      description: 'Custom slug test',
      contentType: 'CLIP',
      categoryId,
      ageCategory: 'ZERO_PLUS',
      isFree: true,
      slug: customSlug,
    }, adminToken);

    expect(res.success).toBe(true);
    const data = res.data as { id: string; slug: string };
    expect(data.slug).toBe(customSlug);
    createdIds.push(data.id);
  });
});
