import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';

describe('TurnstileGuard', () => {
  let guard: TurnstileGuard;

  const createMockContext = (body: Record<string, any> = {}, ip = '127.0.0.1'): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ body, ip, headers: {} }),
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext);

  describe('when TURNSTILE_SECRET_KEY is not configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TurnstileGuard,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
        ],
      }).compile();

      guard = module.get<TurnstileGuard>(TurnstileGuard);
    });

    it('should skip validation and return true', async () => {
      const context = createMockContext({});
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should skip even without turnstileToken in body', async () => {
      const context = createMockContext({ email: 'test@test.com' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('when TURNSTILE_SECRET_KEY is configured', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TurnstileGuard,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('test-secret-key') },
          },
        ],
      }).compile();

      guard = module.get<TurnstileGuard>(TurnstileGuard);
    });

    afterEach(() => {
      fetchSpy?.mockRestore();
    });

    it('should throw if turnstileToken is missing', async () => {
      const context = createMockContext({ email: 'test@test.com' });
      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should return true when Turnstile validates successfully', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const context = createMockContext({ turnstileToken: 'valid-token' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should throw when Turnstile validation fails', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, 'error-codes': ['invalid-input-response'] }),
      } as Response);

      const context = createMockContext({ turnstileToken: 'invalid-token' });
      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should throw when fetch fails', async () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const context = createMockContext({ turnstileToken: 'any-token' });
      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });
  });
});