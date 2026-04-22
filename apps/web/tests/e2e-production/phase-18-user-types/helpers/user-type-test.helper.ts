/**
 * Shared helpers for Phase 18: User-Type feature testing.
 *
 * Provides role-based API calls with raw HTTP status access,
 * token management per role, and authorization assertion helpers.
 */

import { type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginViaApi, PROD_USERS, type ProdUserRole } from '../../helpers/auth.helper';

// ============ Constants ============

const API_BASE = process.env.PROD_API_URL || 'http://89.108.66.37/api/v1';
const AUTH_DIR = path.join(__dirname, '..', '..', 'reports', '.auth');

/** Map role key to storage state filename */
const ROLE_STATE_FILES: Record<ProdUserRole, string> = {
  user: 'user-state.json',
  partner: 'partner-state.json',
  admin: 'admin-state.json',
  minor: 'minor-state.json',
  moderator: 'moderator-state.json',
};

/** Prefix for all test content created by user-type tests */
export const ROLE_TEST_PREFIX = 'E2E-ROLE-TEST-';

// ============ Raw Fetch (exposes HTTP status) ============

export interface RawApiResponse {
  status: number;
  ok: boolean;
  body: {
    success?: boolean;
    data?: unknown;
    error?: { code: string; message: string };
    meta?: { page: number; limit: number; total: number };
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Raw fetch that returns HTTP status code + parsed body.
 * Retries on 502/503 (transient server errors).
 */
export async function rawApiFetch(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  retries = 2
): Promise<RawApiResponse> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if ((res.status === 502 || res.status === 503) && attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }

      let parsed: RawApiResponse['body'] = {};
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        parsed = await res.json();
      }

      return { status: res.status, ok: res.ok, body: parsed };
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`rawApiFetch failed after ${retries + 1} attempts`);
}

// ============ Token Cache ============

const tokenCache: Partial<Record<ProdUserRole, string>> = {};

/**
 * Extract the access token from a global-setup storage state file.
 * Returns null if file doesn't exist or token can't be extracted.
 */
function readTokenFromStateFile(role: ProdUserRole): string | null {
  try {
    const filePath = path.join(AUTH_DIR, ROLE_STATE_FILES[role]);
    if (!fs.existsSync(filePath)) return null;

    const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Token is stored in localStorage as mp-auth-storage JSON
    const origins = state.origins ?? [];
    for (const origin of origins) {
      for (const item of origin.localStorage ?? []) {
        if (item.name === 'mp-auth-storage') {
          const authData = JSON.parse(item.value);
          if (authData?.state?.accessToken) {
            return authData.state.accessToken;
          }
        }
      }
    }

    // Also check cookies as fallback
    for (const cookie of state.cookies ?? []) {
      if (cookie.name === 'mp-auth-token' && cookie.value) {
        return cookie.value;
      }
    }
  } catch {
    // Fall through to API login
  }
  return null;
}

/**
 * Get an access token for a given role.
 * First tries to read from global-setup state files (no extra login needed).
 * Falls back to API login with rate-limit-safe delay.
 */
export async function getTokenForRole(role: ProdUserRole): Promise<string> {
  if (tokenCache[role]) {
    return tokenCache[role]!;
  }

  // Try reading from state file first (avoids rate limiting)
  const fileToken = readTokenFromStateFile(role);
  if (fileToken) {
    tokenCache[role] = fileToken;
    return fileToken;
  }

  // Fallback: login via API with delay to avoid rate limiting
  if (Object.keys(tokenCache).length > 0) {
    await sleep(2000);
  }

  const user = PROD_USERS[role];
  const auth = await loginViaApi(user.email, user.password);
  tokenCache[role] = auth.accessToken;
  return auth.accessToken;
}

/**
 * Clear the token cache (call in afterAll if needed).
 */
export function clearTokenCache(): void {
  for (const key of Object.keys(tokenCache) as ProdUserRole[]) {
    delete tokenCache[key];
  }
}

// ============ Role-Based API Calls ============

export function apiAs(
  role: ProdUserRole,
  method: string,
  path: string,
  body?: unknown
): Promise<RawApiResponse> {
  return getTokenForRole(role).then((token) => rawApiFetch(method, path, body, token));
}

export function apiGetAs(role: ProdUserRole, path: string): Promise<RawApiResponse> {
  return apiAs(role, 'GET', path);
}

export function apiPostAs(
  role: ProdUserRole,
  path: string,
  body?: unknown
): Promise<RawApiResponse> {
  return apiAs(role, 'POST', path, body);
}

export function apiPatchAs(
  role: ProdUserRole,
  path: string,
  body?: unknown
): Promise<RawApiResponse> {
  return apiAs(role, 'PATCH', path, body);
}

export function apiDeleteAs(role: ProdUserRole, path: string): Promise<RawApiResponse> {
  return apiAs(role, 'DELETE', path);
}

// ============ Page Helpers ============

/**
 * Navigate to a page and wait for load.
 * Returns false if redirected to /login (auth expired).
 */
export async function waitForPage(page: Page, path: string): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  return !page.url().includes('/login');
}

// ============ Endpoint Lists (by permission level) ============

/** Endpoints that require no authentication */
export const PUBLIC_ENDPOINTS = [
  '/content',
  '/content?limit=5',
  '/categories',
  '/genres',
  '/tags',
  '/subscriptions/plans',
  '/documents',
  '/bonuses/rate',
] as const;

/** Endpoints that require authentication (any role) */
export const AUTHENTICATED_ENDPOINTS = [
  '/users/me',
  '/notifications',
  '/notifications/unread-count',
  '/users/me/watchlist',
  '/users/me/sessions',
  '/store/cart',
  '/store/products',
] as const;

/** Endpoints accessible only to ADMIN + MODERATOR */
export const ADMIN_MODERATOR_ENDPOINTS = [
  '/admin/dashboard',
  '/admin/content',
  '/admin/store/products',
  '/admin/payments/transactions',
  '/admin/partners',
  '/admin/verifications',
  '/admin/documents',
  '/admin/audit',
] as const;

/** Endpoints accessible ONLY to ADMIN (not moderator) */
export const ADMIN_ONLY_ENDPOINTS = [
  '/admin/users',
  '/admin/bonuses/stats',
  '/admin/bonuses/rates',
  '/admin/bonuses/campaigns',
] as const;

/** Partner-specific endpoints */
export const PARTNER_ENDPOINTS = [
  '/partners/dashboard',
  '/partners/referrals',
  '/partners/commissions',
  '/partners/balance',
  '/partners/withdrawals',
] as const;
