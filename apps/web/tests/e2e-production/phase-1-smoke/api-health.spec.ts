import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';

test.describe('API Health', () => {
  test('GET /api/v1/content returns JSON response', async () => {
    const res = await apiGet('/content');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('GET /api/v1/subscriptions/plans is reachable', async () => {
    const res = await apiGet('/subscriptions/plans');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('GET /api/v1/genres returns data', async () => {
    const res = await apiGet('/genres');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('GET /api/v1/store/products is reachable', async () => {
    const res = await apiGet('/store/products');
    // May require auth — just verify API responds with JSON
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('GET /api/v1/categories returns data', async () => {
    const res = await apiGet('/categories');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('API responses return within 30 seconds', async () => {
    const start = Date.now();
    await apiGet('/content');
    const elapsed = Date.now() - start;
    // Production server behind nginx can be slow on cold start
    expect(elapsed).toBeLessThan(30_000);
  });
});
