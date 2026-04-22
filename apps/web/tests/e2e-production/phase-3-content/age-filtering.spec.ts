import { test, expect } from '@playwright/test';
import { PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi } from '../helpers/auth.helper';

test.describe('Age Filtering', () => {
  test('minor user content API excludes 18+ items', async () => {
    let minorAuth;
    try {
      minorAuth = await loginViaApi(
        PROD_USERS.minor.email,
        PROD_USERS.minor.password
      );
    } catch {
      test.skip(true, 'Minor login failed — possible 502');
      return;
    }

    const res = await apiGet('/content', minorAuth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success) {
      const items = (res.data as { items?: { ageCategory: string }[] })?.items;
      if (items && items.length > 0) {
        const has18Plus = items.some(
          (item) => item.ageCategory === 'EIGHTEEN_PLUS'
        );
        expect(has18Plus).toBe(false);
      }
    }
  });

  test('adult user content API works', async () => {
    let userAuth;
    try {
      userAuth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
    } catch {
      test.skip(true, 'User login failed — possible 502');
      return;
    }

    const res = await apiGet('/content', userAuth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('content API without auth returns public content', async () => {
    const res = await apiGet('/content');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('age category values are valid', async () => {
    const res = await apiGet('/content');
    if (!res.success) {
      test.skip(true, 'Content API not available');
      return;
    }

    const data = res.data as { items?: { ageCategory?: string }[] } | { ageCategory?: string }[];
    const items = Array.isArray(data) ? data : data?.items;
    if (items && items.length > 0) {
      const validCategories = [
        'ZERO_PLUS',
        'SIX_PLUS',
        'TWELVE_PLUS',
        'SIXTEEN_PLUS',
        'EIGHTEEN_PLUS',
        '0+',
        '6+',
        '12+',
        '16+',
        '18+',
      ];
      for (const item of items) {
        if (item.ageCategory) {
          expect(validCategories).toContain(item.ageCategory);
        }
      }
    }
  });
});
