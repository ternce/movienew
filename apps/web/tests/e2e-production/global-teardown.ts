import { PROD_USERS, loginViaApi } from './helpers/auth.helper';
import { clearCart, clearWatchlist, markAllNotificationsRead, cleanupTestContent } from './helpers/cleanup.helper';
import { apiGet, apiDelete } from './helpers/api.helper';

/**
 * Global teardown: clean up any test data created during the run.
 * Runs once after the entire test suite completes.
 */
async function globalTeardown() {
  console.log('[global-teardown] Cleaning up test data...');

  try {
    const userAuth = await loginViaApi(
      PROD_USERS.user.email,
      PROD_USERS.user.password
    );

    await clearCart(userAuth.accessToken);
    await clearWatchlist(userAuth.accessToken);
    await markAllNotificationsRead(userAuth.accessToken);

    console.log('[global-teardown] User cleanup complete.');
  } catch (err) {
    console.warn('[global-teardown] User cleanup failed (non-fatal):', err);
  }

  // Clean up admin test content (E2E-TEST- and E2E-ROLE-TEST- prefixes)
  try {
    const adminAuth = await loginViaApi(
      PROD_USERS.admin.email,
      PROD_USERS.admin.password
    );
    await cleanupTestContent(adminAuth.accessToken);

    // Also clean up role-test content from Phase 18
    const roleRes = await apiGet(
      `/admin/content?search=${encodeURIComponent('E2E-ROLE-TEST-')}&limit=100`,
      adminAuth.accessToken
    );
    if (roleRes.success && roleRes.data) {
      const data = roleRes.data as { items?: { id: string; title: string }[] };
      const items = data.items ?? [];
      let cleaned = 0;
      for (const item of items) {
        if (item.title.startsWith('E2E-ROLE-TEST-')) {
          await apiDelete(`/admin/content/${item.id}`, adminAuth.accessToken);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(`[global-teardown] Cleaned ${cleaned} role-test content items`);
      }
    }

    console.log('[global-teardown] Admin test content cleanup complete.');
  } catch (err) {
    console.warn('[global-teardown] Admin cleanup failed (non-fatal):', err);
  }
}

export default globalTeardown;
