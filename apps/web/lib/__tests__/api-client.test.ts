import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, api, endpoints } from '../api-client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
  get length() {
    return Object.keys(mockLocalStorage.store).length;
  },
  key: vi.fn((index: number) => Object.keys(mockLocalStorage.store)[index] || null),
};

// Mock sessionStorage
const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockSessionStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store = {};
  }),
  get length() {
    return Object.keys(mockSessionStorage.store).length;
  },
  key: vi.fn((index: number) => Object.keys(mockSessionStorage.store)[index] || null),
};

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage });

describe('ApiError', () => {
  it('should create error with message and status', () => {
    const error = new ApiError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  it('should create error with code', () => {
    const error = new ApiError('Unauthorized', 401, 'AUTH_002');
    expect(error.code).toBe('AUTH_002');
  });

  it('should create error with details', () => {
    const details = { email: ['Invalid format'] };
    const error = new ApiError('Validation failed', 400, 'VAL_001', details);
    expect(error.details).toEqual(details);
  });

  it('should extend Error', () => {
    const error = new ApiError('Error', 500);
    expect(error).toBeInstanceOf(Error);
  });

  describe('getUserMessage()', () => {
    it('should return user-friendly message for known code', () => {
      const error = new ApiError('Error', 401, 'AUTH_001');
      expect(error.getUserMessage()).toBe('Неверный email или пароль');
    });

    it('should return default message for unknown code', () => {
      const error = new ApiError('Error', 500, 'UNKNOWN_999');
      expect(error.getUserMessage()).toBe('Произошла ошибка. Попробуйте позже');
    });

    it('should return default message when no code', () => {
      const error = new ApiError('Error', 500);
      expect(error.getUserMessage()).toBe('Произошла ошибка. Попробуйте позже');
    });
  });

  describe('isAuthError()', () => {
    it('should return true for auth error codes', () => {
      const error = new ApiError('Error', 401, 'AUTH_002');
      expect(error.isAuthError()).toBe(true);
    });

    it('should return false for non-auth error codes', () => {
      const error = new ApiError('Error', 400, 'VAL_001');
      expect(error.isAuthError()).toBe(false);
    });

    it('should return false when no code', () => {
      const error = new ApiError('Error', 401);
      expect(error.isAuthError()).toBe(false);
    });
  });
});

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupAuthStorage = (accessToken = 'test-access-token', refreshToken = 'test-refresh-token') => {
    mockLocalStorage.store['mp-auth-storage'] = JSON.stringify({
      state: {
        accessToken,
        refreshToken,
      },
    });
  };

  const mockSuccessResponse = (data: unknown, status = 200) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ success: true, data }),
    });
  };

  const mockErrorResponse = (
    status: number,
    message: string,
    code?: string,
    details?: Record<string, string[]>
  ) => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ success: false, message, code, details }),
    });
  };

  describe('api.get()', () => {
    it('should make GET request', async () => {
      mockSuccessResponse({ id: 1, name: 'Test' });

      const result = await api.get('/users/me');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should include auth token when available', async () => {
      setupAuthStorage();
      mockSuccessResponse({});

      await api.get('/users/me');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should add query params to URL', async () => {
      mockSuccessResponse([]);

      await api.get('/content', { params: { page: 1, limit: 10, sort: 'name' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should skip null and undefined params', async () => {
      mockSuccessResponse([]);

      await api.get('/content', { params: { page: 1, filter: null, sort: undefined } });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('page=1');
      expect(url).not.toContain('filter');
      expect(url).not.toContain('sort');
    });

    it('should skip empty string params', async () => {
      mockSuccessResponse([]);

      await api.get('/content', { params: { page: 1, search: '' } });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('search');
    });
  });

  describe('api.post()', () => {
    it('should make POST request with body', async () => {
      mockSuccessResponse({ id: 1 });

      await api.post('/auth/login', { email: 'test@example.com', password: 'password' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      );
    });

    it('should set Content-Type header', async () => {
      mockSuccessResponse({});

      await api.post('/auth/register', {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('api.put()', () => {
    it('should make PUT request', async () => {
      mockSuccessResponse({});

      await api.put('/users/me', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('api.patch()', () => {
    it('should make PATCH request', async () => {
      mockSuccessResponse({});

      await api.patch('/users/me', { name: 'Patched' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('api.delete()', () => {
    it('should make DELETE request', async () => {
      mockSuccessResponse({});

      await api.delete('/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError on failed request', async () => {
      mockErrorResponse(400, 'Bad Request', 'VAL_001');

      await expect(api.get('/test')).rejects.toThrow(ApiError);
    });

    it('should include error code in ApiError', async () => {
      mockErrorResponse(401, 'Unauthorized', 'AUTH_002');

      try {
        await api.get('/test', { skipRefresh: true });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('AUTH_002');
      }
    });

    it('should include details in ApiError', async () => {
      const details = { email: ['Invalid format'] };
      mockErrorResponse(400, 'Validation failed', 'VAL_001', details);

      try {
        await api.get('/test');
      } catch (error) {
        expect((error as ApiError).details).toEqual(details);
      }
    });
  });

  describe('Token refresh', () => {
    it('should attempt refresh on 401 response', async () => {
      setupAuthStorage();

      // First request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      // Refresh request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        }),
      });

      // Retry request succeeds
      mockSuccessResponse({ id: 1 });

      const result = await api.get('/users/me');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.data).toEqual({ id: 1 });
    });

    it('should use new token after refresh', async () => {
      setupAuthStorage();

      // First request returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      // Refresh request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        }),
      });

      // Retry request
      mockSuccessResponse({});

      await api.get('/users/me');

      // Third call should have new token
      const lastCall = mockFetch.mock.calls[2];
      expect(lastCall[1].headers.Authorization).toBe('Bearer new-access-token');
    });

    it('should skip refresh when skipRefresh is true', async () => {
      setupAuthStorage();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      await expect(
        api.get('/test', { skipRefresh: true })
      ).rejects.toThrow(ApiError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should skip auth header when skipAuth is true', async () => {
      setupAuthStorage();
      mockSuccessResponse({});

      await api.get('/public', { skipAuth: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('api.upload()', () => {
    it('should upload FormData', async () => {
      setupAuthStorage();
      mockSuccessResponse({ url: 'https://cdn.example.com/image.jpg' });

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.jpg');

      const result = await api.upload('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
      expect(result.data).toEqual({ url: 'https://cdn.example.com/image.jpg' });
    });

    it('should not set Content-Type for FormData', async () => {
      mockSuccessResponse({});

      const formData = new FormData();
      await api.upload('/upload', formData);

      // Content-Type should not be set (browser sets it with boundary)
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should include auth token in upload', async () => {
      setupAuthStorage();
      mockSuccessResponse({});

      const formData = new FormData();
      await api.upload('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should handle 401 with token refresh for upload', async () => {
      setupAuthStorage();

      // Upload returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      // Refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
        }),
      });

      // Retry upload succeeds
      mockSuccessResponse({});

      const formData = new FormData();
      await api.upload('/upload', formData);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

describe('endpoints', () => {
  describe('auth', () => {
    it('should have correct auth endpoints', () => {
      expect(endpoints.auth.login).toBe('/auth/login');
      expect(endpoints.auth.register).toBe('/auth/register');
      expect(endpoints.auth.logout).toBe('/auth/logout');
      expect(endpoints.auth.refresh).toBe('/auth/refresh');
      expect(endpoints.auth.forgotPassword).toBe('/auth/forgot-password');
      expect(endpoints.auth.resetPassword).toBe('/auth/reset-password');
      expect(endpoints.auth.verifyEmail('token123')).toBe('/auth/verify-email/token123');
    });
  });

  describe('users', () => {
    it('should have correct user endpoints', () => {
      expect(endpoints.users.me).toBe('/users/me');
      expect(endpoints.users.profile).toBe('/users/me/profile');
      expect(endpoints.users.password).toBe('/users/me/password');
      expect(endpoints.users.verification).toBe('/users/me/verification');
      expect(endpoints.users.verificationStatus).toBe('/users/me/verification/status');
    });
  });

  describe('content', () => {
    it('should have correct content endpoints', () => {
      expect(endpoints.content.list).toBe('/content');
      expect(endpoints.content.detail('my-series')).toBe('/content/my-series');
      expect(endpoints.content.featured).toBe('/content/featured');
      expect(endpoints.content.search).toBe('/content/search');
      expect(endpoints.content.recordView('content-123')).toBe('/content/content-123/view');
    });
  });

  describe('series', () => {
    it('should have correct series endpoints', () => {
      expect(endpoints.series.list).toBe('/series');
      expect(endpoints.series.detail('my-series')).toBe('/series/my-series');
      expect(endpoints.series.episodes('series-123')).toBe('/series/series-123/episodes');
    });
  });

  describe('categories', () => {
    it('should have correct category endpoints', () => {
      expect(endpoints.categories.list).toBe('/categories');
      expect(endpoints.categories.tree).toBe('/categories/tree');
    });
  });

  describe('watchHistory', () => {
    it('should have correct watch history endpoints', () => {
      expect(endpoints.watchHistory.list).toBe('/users/me/watch-history');
      expect(endpoints.watchHistory.continueWatching).toBe('/users/me/watch-history/continue');
      expect(endpoints.watchHistory.updateProgress('content-123')).toBe('/users/me/watch-history/content-123');
    });
  });

  describe('subscriptions', () => {
    it('should have correct subscription endpoints', () => {
      expect(endpoints.subscriptions.plans).toBe('/subscriptions/plans');
      expect(endpoints.subscriptions.plan('plan-123')).toBe('/subscriptions/plans/plan-123');
      expect(endpoints.subscriptions.my).toBe('/subscriptions/my');
      expect(endpoints.subscriptions.purchase).toBe('/subscriptions/purchase');
      expect(endpoints.subscriptions.cancel).toBe('/subscriptions/cancel');
      expect(endpoints.subscriptions.autoRenew).toBe('/subscriptions/auto-renew');
      expect(endpoints.subscriptions.checkAccess('content-123')).toBe('/subscriptions/access/content-123');
    });
  });

  describe('payments', () => {
    it('should have correct payment endpoints', () => {
      expect(endpoints.payments.initiate).toBe('/payments/initiate');
      expect(endpoints.payments.status('tx-123')).toBe('/payments/status/tx-123');
      expect(endpoints.payments.transactions).toBe('/payments/transactions');
      expect(endpoints.payments.refund).toBe('/payments/refund');
      expect(endpoints.payments.complete('tx-123')).toBe('/payments/complete/tx-123');
    });
  });

  describe('partners', () => {
    it('should have correct partner endpoints', () => {
      expect(endpoints.partners.levels).toBe('/partners/levels');
      expect(endpoints.partners.dashboard).toBe('/partners/dashboard');
      expect(endpoints.partners.referrals).toBe('/partners/referrals');
      expect(endpoints.partners.commissions).toBe('/partners/commissions');
      expect(endpoints.partners.commission('comm-123')).toBe('/partners/commissions/comm-123');
      expect(endpoints.partners.balance).toBe('/partners/balance');
      expect(endpoints.partners.withdrawals).toBe('/partners/withdrawals');
      expect(endpoints.partners.withdrawal('wd-123')).toBe('/partners/withdrawals/wd-123');
    });
  });

  describe('bonuses', () => {
    it('should have correct bonus endpoints', () => {
      expect(endpoints.bonuses.balance).toBe('/bonuses/balance');
      expect(endpoints.bonuses.statistics).toBe('/bonuses/statistics');
      expect(endpoints.bonuses.transactions).toBe('/bonuses/transactions');
      expect(endpoints.bonuses.expiring).toBe('/bonuses/expiring');
      expect(endpoints.bonuses.maxApplicable).toBe('/bonuses/max-applicable');
      expect(endpoints.bonuses.withdraw).toBe('/bonuses/withdraw');
      expect(endpoints.bonuses.rate).toBe('/bonuses/rate');
    });
  });

  describe('genres', () => {
    it('should have correct genre endpoints', () => {
      expect(endpoints.genres.list).toBe('/genres');
      expect(endpoints.genres.detail('genre-123')).toBe('/genres/genre-123');
      expect(endpoints.genres.bySlug('action')).toBe('/genres/slug/action');
    });
  });

  describe('userGenres', () => {
    it('should have correct user genre endpoints', () => {
      expect(endpoints.userGenres.list).toBe('/users/me/genres');
      expect(endpoints.userGenres.add).toBe('/users/me/genres');
      expect(endpoints.userGenres.update('pref-123')).toBe('/users/me/genres/pref-123');
      expect(endpoints.userGenres.remove('pref-123')).toBe('/users/me/genres/pref-123');
      expect(endpoints.userGenres.reorder).toBe('/users/me/genres/reorder');
    });
  });
});
