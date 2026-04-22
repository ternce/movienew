import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  CacheControlInterceptor,
  CacheControlOptions,
  CACHE_PRESETS,
  CACHE_CONTROL_KEY,
  CacheControl,
  CacheFor,
  createCacheControlInterceptor,
} from '../cache-control.interceptor';

/**
 * Create mock execution context
 */
const createMockContext = (headersSent = false) => {
  const mockSetHeader = jest.fn();
  const mockResponse = {
    headersSent,
    setHeader: mockSetHeader,
  };

  const mockContext: Partial<ExecutionContext> = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getHandler: jest.fn().mockReturnValue(() => {}),
  };

  return {
    context: mockContext as ExecutionContext,
    mockSetHeader,
    mockResponse,
  };
};

/**
 * Create mock call handler
 */
const createMockCallHandler = (returnValue: unknown = {}): CallHandler => ({
  handle: jest.fn().mockReturnValue(of(returnValue)),
});

describe('CacheControlInterceptor', () => {
  describe('CACHE_PRESETS', () => {
    describe('NO_CACHE', () => {
      it('should have noCache and noStore set to true', () => {
        expect(CACHE_PRESETS.NO_CACHE).toEqual({
          noCache: true,
          noStore: true,
        });
      });
    });

    describe('PRIVATE_SHORT', () => {
      it('should have correct values for 5 minute private cache', () => {
        expect(CACHE_PRESETS.PRIVATE_SHORT).toEqual({
          isPrivate: true,
          maxAge: 300,
          mustRevalidate: true,
        });
      });
    });

    describe('PRIVATE_MEDIUM', () => {
      it('should have correct values for 1 hour private cache', () => {
        expect(CACHE_PRESETS.PRIVATE_MEDIUM).toEqual({
          isPrivate: true,
          maxAge: 3600,
          mustRevalidate: true,
        });
      });
    });

    describe('CDN_SHORT', () => {
      it('should have correct values for 5 minute CDN cache', () => {
        expect(CACHE_PRESETS.CDN_SHORT).toEqual({
          isPublic: true,
          maxAge: 60,
          sMaxAge: 300,
          staleWhileRevalidate: 60,
        });
      });
    });

    describe('CDN_MEDIUM', () => {
      it('should have correct values for 1 hour CDN cache', () => {
        expect(CACHE_PRESETS.CDN_MEDIUM).toEqual({
          isPublic: true,
          maxAge: 300,
          sMaxAge: 3600,
          staleWhileRevalidate: 300,
          staleIfError: 86400,
        });
      });
    });

    describe('CDN_LONG', () => {
      it('should have correct values for 24 hour CDN cache', () => {
        expect(CACHE_PRESETS.CDN_LONG).toEqual({
          isPublic: true,
          maxAge: 3600,
          sMaxAge: 86400,
          staleWhileRevalidate: 3600,
          staleIfError: 604800,
        });
      });
    });

    describe('IMMUTABLE', () => {
      it('should have correct values for immutable content', () => {
        expect(CACHE_PRESETS.IMMUTABLE).toEqual({
          isPublic: true,
          maxAge: 31536000,
          immutable: true,
        });
      });
    });
  });

  describe('buildCacheControlHeader()', () => {
    let interceptor: CacheControlInterceptor;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      interceptor = new CacheControlInterceptor(reflector);
    });

    const buildHeader = (options: CacheControlOptions): string => {
      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue(options);

      return new Promise<string>((resolve) => {
        interceptor.intercept(context, callHandler).subscribe(() => {
          const headerValue = mockSetHeader.mock.calls[0]?.[1] || '';
          resolve(headerValue);
        });
      });
    };

    it('should return "no-store" when noStore is true', async () => {
      const header = await buildHeader({ noStore: true });
      expect(header).toBe('no-store');
    });

    it('should not include other directives when noStore is true', async () => {
      const header = await buildHeader({
        noStore: true,
        isPublic: true,
        maxAge: 300,
      });
      expect(header).toBe('no-store');
    });

    it('should include no-cache directive', async () => {
      const header = await buildHeader({ noCache: true });
      expect(header).toContain('no-cache');
    });

    it('should include public directive', async () => {
      const header = await buildHeader({ isPublic: true, maxAge: 60 });
      expect(header).toContain('public');
    });

    it('should include private directive', async () => {
      const header = await buildHeader({ isPrivate: true, maxAge: 60 });
      expect(header).toContain('private');
    });

    it('should not include both public and private', async () => {
      const header = await buildHeader({ isPublic: true, maxAge: 60 });
      expect(header).not.toContain('private');
    });

    it('should include max-age directive', async () => {
      const header = await buildHeader({ maxAge: 3600 });
      expect(header).toContain('max-age=3600');
    });

    it('should include max-age=0', async () => {
      const header = await buildHeader({ maxAge: 0 });
      expect(header).toContain('max-age=0');
    });

    it('should include s-maxage directive', async () => {
      const header = await buildHeader({ isPublic: true, sMaxAge: 7200 });
      expect(header).toContain('s-maxage=7200');
    });

    it('should include must-revalidate directive', async () => {
      const header = await buildHeader({ mustRevalidate: true, maxAge: 60 });
      expect(header).toContain('must-revalidate');
    });

    it('should include stale-while-revalidate directive', async () => {
      const header = await buildHeader({ staleWhileRevalidate: 120 });
      expect(header).toContain('stale-while-revalidate=120');
    });

    it('should include stale-if-error directive', async () => {
      const header = await buildHeader({ staleIfError: 86400 });
      expect(header).toContain('stale-if-error=86400');
    });

    it('should include immutable directive', async () => {
      const header = await buildHeader({ immutable: true, maxAge: 31536000 });
      expect(header).toContain('immutable');
    });

    it('should combine multiple directives correctly', async () => {
      const header = await buildHeader({
        isPublic: true,
        maxAge: 300,
        sMaxAge: 3600,
        staleWhileRevalidate: 60,
      });

      expect(header).toContain('public');
      expect(header).toContain('max-age=300');
      expect(header).toContain('s-maxage=3600');
      expect(header).toContain('stale-while-revalidate=60');
    });

    it('should build correct header for NO_CACHE preset', async () => {
      const header = await buildHeader(CACHE_PRESETS.NO_CACHE);
      expect(header).toBe('no-store');
    });

    it('should build correct header for PRIVATE_SHORT preset', async () => {
      const header = await buildHeader(CACHE_PRESETS.PRIVATE_SHORT);
      expect(header).toContain('private');
      expect(header).toContain('max-age=300');
      expect(header).toContain('must-revalidate');
    });

    it('should build correct header for CDN_SHORT preset', async () => {
      const header = await buildHeader(CACHE_PRESETS.CDN_SHORT);
      expect(header).toContain('public');
      expect(header).toContain('max-age=60');
      expect(header).toContain('s-maxage=300');
      expect(header).toContain('stale-while-revalidate=60');
    });

    it('should build correct header for CDN_MEDIUM preset', async () => {
      const header = await buildHeader(CACHE_PRESETS.CDN_MEDIUM);
      expect(header).toContain('public');
      expect(header).toContain('max-age=300');
      expect(header).toContain('s-maxage=3600');
      expect(header).toContain('stale-while-revalidate=300');
      expect(header).toContain('stale-if-error=86400');
    });

    it('should build correct header for CDN_LONG preset', async () => {
      const header = await buildHeader(CACHE_PRESETS.CDN_LONG);
      expect(header).toContain('public');
      expect(header).toContain('max-age=3600');
      expect(header).toContain('s-maxage=86400');
      expect(header).toContain('stale-while-revalidate=3600');
      expect(header).toContain('stale-if-error=604800');
    });

    it('should build correct header for IMMUTABLE preset', async () => {
      const header = await buildHeader(CACHE_PRESETS.IMMUTABLE);
      expect(header).toContain('public');
      expect(header).toContain('max-age=31536000');
      expect(header).toContain('immutable');
    });
  });

  describe('Interceptor behavior', () => {
    let interceptor: CacheControlInterceptor;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      interceptor = new CacheControlInterceptor(reflector);
    });

    it('should set Cache-Control header from decorator', (done) => {
      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue({ maxAge: 300 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).toHaveBeenCalledWith(
          'Cache-Control',
          expect.any(String)
        );
        done();
      });
    });

    it('should use default options when no decorator options', (done) => {
      const defaultOptions: CacheControlOptions = { maxAge: 600 };
      const interceptorWithDefaults = new CacheControlInterceptor(reflector, defaultOptions);
      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      interceptorWithDefaults.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).toHaveBeenCalledWith(
          'Cache-Control',
          'max-age=600'
        );
        done();
      });
    });

    it('should skip setting header when no options', (done) => {
      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).not.toHaveBeenCalled();
        done();
      });
    });

    it('should skip when headers already sent', (done) => {
      const { context, mockSetHeader } = createMockContext(true);
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue({ maxAge: 300 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).not.toHaveBeenCalled();
        done();
      });
    });

    it('should set Vary header for public cache', (done) => {
      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue({ isPublic: true, maxAge: 300 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).toHaveBeenCalledWith(
          'Vary',
          'Accept-Encoding, Accept-Language'
        );
        done();
      });
    });

    it('should not set Vary header for private cache', (done) => {
      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      jest.spyOn(reflector, 'get').mockReturnValue({ isPrivate: true, maxAge: 300 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).not.toHaveBeenCalledWith('Vary', expect.anything());
        done();
      });
    });

    it('should pass through the response data', (done) => {
      const { context } = createMockContext();
      const responseData = { id: 1, name: 'Test' };
      const callHandler = createMockCallHandler(responseData);

      jest.spyOn(reflector, 'get').mockReturnValue({ maxAge: 300 });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual(responseData);
        done();
      });
    });

    it('should use getHandler to get metadata', () => {
      const { context } = createMockContext();
      const callHandler = createMockCallHandler();
      const reflectorSpy = jest.spyOn(reflector, 'get').mockReturnValue({ maxAge: 60 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(reflectorSpy).toHaveBeenCalledWith(
          CACHE_CONTROL_KEY,
          context.getHandler()
        );
      });
    });
  });

  describe('CacheControl decorator', () => {
    it('should create decorator with options', () => {
      const decorator = CacheControl({ maxAge: 300 });
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should set metadata correctly', () => {
      const options: CacheControlOptions = { isPublic: true, maxAge: 600 };
      const decorator = CacheControl(options);

      // Create a mock target to apply decorator
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor: PropertyDescriptor = { value: () => {} };

      // Apply decorator
      decorator(target, propertyKey, descriptor);

      // Use Reflector to verify metadata
      const reflector = new Reflector();
      const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
      expect(metadata).toEqual(options);
    });
  });

  describe('CacheFor helpers', () => {
    describe('oneMinute()', () => {
      it('should return decorator for 1 minute private cache', () => {
        const decorator = CacheFor.oneMinute();
        expect(decorator).toBeDefined();

        // Apply and check metadata
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual({ isPrivate: true, maxAge: 60 });
      });
    });

    describe('fiveMinutes()', () => {
      it('should return decorator for 5 minute private cache', () => {
        const decorator = CacheFor.fiveMinutes();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual({ isPrivate: true, maxAge: 300 });
      });
    });

    describe('oneHour()', () => {
      it('should return decorator for 1 hour private cache', () => {
        const decorator = CacheFor.oneHour();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual({ isPrivate: true, maxAge: 3600 });
      });
    });

    describe('cdnFiveMinutes()', () => {
      it('should return decorator for CDN_SHORT preset', () => {
        const decorator = CacheFor.cdnFiveMinutes();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual(CACHE_PRESETS.CDN_SHORT);
      });
    });

    describe('cdnOneHour()', () => {
      it('should return decorator for CDN_MEDIUM preset', () => {
        const decorator = CacheFor.cdnOneHour();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual(CACHE_PRESETS.CDN_MEDIUM);
      });
    });

    describe('cdnOneDay()', () => {
      it('should return decorator for CDN_LONG preset', () => {
        const decorator = CacheFor.cdnOneDay();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual(CACHE_PRESETS.CDN_LONG);
      });
    });

    describe('never()', () => {
      it('should return decorator for NO_CACHE preset', () => {
        const decorator = CacheFor.never();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual(CACHE_PRESETS.NO_CACHE);
      });
    });

    describe('forever()', () => {
      it('should return decorator for IMMUTABLE preset', () => {
        const decorator = CacheFor.forever();
        const descriptor: PropertyDescriptor = { value: () => {} };
        decorator({}, 'method', descriptor);

        const reflector = new Reflector();
        const metadata = reflector.get(CACHE_CONTROL_KEY, descriptor.value);
        expect(metadata).toEqual(CACHE_PRESETS.IMMUTABLE);
      });
    });
  });

  describe('createCacheControlInterceptor()', () => {
    it('should create interceptor class with default options', () => {
      const InterceptorClass = createCacheControlInterceptor({ maxAge: 120 });
      expect(InterceptorClass).toBeDefined();
    });

    it('should use default options in created interceptor', (done) => {
      const defaultOptions: CacheControlOptions = { isPrivate: true, maxAge: 120 };
      const InterceptorClass = createCacheControlInterceptor(defaultOptions);

      // Create instance with injected Reflector
      const reflector = new Reflector();
      const interceptor = new InterceptorClass(reflector);

      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      // No decorator options
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).toHaveBeenCalledWith(
          'Cache-Control',
          expect.stringContaining('max-age=120')
        );
        done();
      });
    });

    it('should extend CacheControlInterceptor', () => {
      const InterceptorClass = createCacheControlInterceptor();
      const reflector = new Reflector();
      const instance = new InterceptorClass(reflector);

      expect(instance).toBeInstanceOf(CacheControlInterceptor);
    });

    it('should work without default options', (done) => {
      const InterceptorClass = createCacheControlInterceptor();
      const reflector = new Reflector();
      const interceptor = new InterceptorClass(reflector);

      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      // With decorator options
      jest.spyOn(reflector, 'get').mockReturnValue({ maxAge: 300 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).toHaveBeenCalledWith(
          'Cache-Control',
          'max-age=300'
        );
        done();
      });
    });

    it('should override defaults with decorator options', (done) => {
      const defaultOptions: CacheControlOptions = { maxAge: 60 };
      const InterceptorClass = createCacheControlInterceptor(defaultOptions);

      const reflector = new Reflector();
      const interceptor = new InterceptorClass(reflector);

      const { context, mockSetHeader } = createMockContext();
      const callHandler = createMockCallHandler();

      // Decorator options should override defaults
      jest.spyOn(reflector, 'get').mockReturnValue({ maxAge: 3600 });

      interceptor.intercept(context, callHandler).subscribe(() => {
        expect(mockSetHeader).toHaveBeenCalledWith(
          'Cache-Control',
          'max-age=3600'
        );
        done();
      });
    });
  });
});
