/**
 * Backward-compatible re-export from the modular API client.
 *
 * All code has been split into:
 *   - ./api/errors.ts     — ApiError, NetworkError
 *   - ./api/auth.ts       — token management & refresh
 *   - ./api/client.ts     — request(), upload(), buildUrl()
 *   - ./api/endpoints.ts  — api methods & endpoint paths
 *   - ./api/index.ts      — barrel file
 *
 * Existing imports from '@/lib/api-client' continue to work unchanged.
 */
export * from './api';
