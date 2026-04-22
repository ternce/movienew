import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockExecutionContext = (_isPublic: boolean = false): ExecutionContext => {
    const request = { user: null };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      const context = mockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call super.canActivate for protected routes', async () => {
      const context = mockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Mock the parent's canActivate to avoid passport strategy lookup
      const parentCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(parentCanActivateSpy).toHaveBeenCalledWith(context);

      parentCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user for public routes even if undefined', () => {
      const context = mockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.handleRequest(null, undefined, null, context);

      expect(result).toBeUndefined();
    });

    it('should return user for public routes when user exists', () => {
      const context = mockExecutionContext();
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.handleRequest(null, mockUser, null, context);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for protected routes without user', () => {
      const context = mockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        'Authentication required',
      );
    });

    it('should throw original error for protected routes', () => {
      const context = mockExecutionContext();
      const originalError = new Error('Token expired');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.handleRequest(originalError, null, null, context)).toThrow(
        originalError,
      );
    });

    it('should return user for protected routes when valid', () => {
      const context = mockExecutionContext();
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.handleRequest(null, mockUser, null, context);

      expect(result).toEqual(mockUser);
    });
  });
});
