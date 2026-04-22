import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Production E2E Playwright configuration for MoviePlatform.
 *
 * Key differences from dev config:
 * - baseURL points to live production server
 * - Sequential execution (workers: 1) to be safe for production
 * - Higher timeouts for real network
 * - No webServer block (tests run against live server)
 * - Project dependencies enforce phase ordering
 */

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'http://89.108.66.37';
const AUTH_DIR = path.join(__dirname, 'reports', '.auth');

export default defineConfig({
  testDir: __dirname,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  forbidOnly: true,
  reporter: [
    ['html', { outputFolder: path.join(__dirname, 'reports', 'html'), open: 'never' }],
    ['list'],
    ['json', { outputFile: path.join(__dirname, 'reports', 'results.json') }],
  ],
  use: {
    baseURL: PROD_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: path.join(__dirname, 'reports', 'test-results'),

  globalSetup: path.join(__dirname, 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'global-teardown.ts'),

  projects: [
    // Phase 1: Smoke — no auth required
    {
      name: 'smoke',
      testDir: './phase-1-smoke',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Phase 2: Auth — depends on smoke
    {
      name: 'auth',
      testDir: './phase-2-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['smoke'],
    },

    // Phase 3: Content — depends on auth, uses user state
    {
      name: 'content',
      testDir: './phase-3-content',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 4: Video — depends on auth, uses user state
    {
      name: 'video',
      testDir: './phase-4-video',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 5: Account — depends on auth, uses user state
    {
      name: 'account',
      testDir: './phase-5-account',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 6: Store — depends on auth, uses user state
    {
      name: 'store',
      testDir: './phase-6-store',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 7: Partner — depends on auth, uses partner state
    {
      name: 'partner',
      testDir: './phase-7-partner',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'partner-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 8: Admin — depends on auth, uses admin state
    {
      name: 'admin',
      testDir: './phase-8-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'admin-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 9: Responsive — depends on auth, mobile viewport (Chromium with mobile emulation)
    {
      name: 'responsive',
      testDir: './phase-9-responsive',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 10: Access Control — depends on auth, uses multiple role states
    {
      name: 'access-control',
      testDir: './phase-10-access-control',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 11: Bonuses — depends on auth, uses user state
    {
      name: 'bonuses',
      testDir: './phase-11-bonuses',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 12: Studio — depends on auth, uses admin state
    {
      name: 'studio',
      testDir: './phase-12-studio',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'admin-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 13: Payments — depends on auth, uses user state
    {
      name: 'payments',
      testDir: './phase-13-payments',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 14: Documents — depends on auth, uses user state
    {
      name: 'documents',
      testDir: './phase-14-documents',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 15: Errors — depends on smoke, no auth needed
    {
      name: 'errors',
      testDir: './phase-15-errors',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['smoke'],
    },

    // Phase 16: UI Interactions — depends on auth, uses user state (specs override for admin)
    {
      name: 'ui-interactions',
      testDir: './phase-16-ui-interactions',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 17: UI Responsive — depends on auth, tests across 3 viewports
    {
      name: 'ui-responsive',
      testDir: './phase-17-ui-responsive',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },

    // Phase 18: User Types — comprehensive role-based authorization tests
    // Uses multiple storage states per spec (specs override as needed)
    {
      name: 'user-types',
      testDir: './phase-18-user-types',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'user-state.json'),
      },
      dependencies: ['auth'],
    },
  ],
});
