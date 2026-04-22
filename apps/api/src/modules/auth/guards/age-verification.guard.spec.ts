import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { AgeVerificationGuard } from './age-verification.guard';
import { AGE_RESTRICTION_KEY } from '../../../common/decorators/age-restriction.decorator';

// Define AgeCategory enum for tests
enum AgeCategory {
  ZERO_PLUS = '0+',
  SIX_PLUS = '6+',
  TWELVE_PLUS = '12+',
  SIXTEEN_PLUS = '16+',
  EIGHTEEN_PLUS = '18+',
}

describe('AgeVerificationGuard', () => {
  let guard: AgeVerificationGuard;
  let reflector: Reflector;

  const createMockContext = (user: any = null): ExecutionContext => {
    const request = { user };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
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
        AgeVerificationGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AgeVerificationGuard>(AgeVerificationGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no age restriction is specified', () => {
      const context = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow 0+ content for unauthenticated users', () => {
      const context = createMockContext(null); // No user
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.ZERO_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny 6+ content for unauthenticated users', () => {
      const context = createMockContext(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.SIX_PLUS);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny 18+ content for unauthenticated users', () => {
      const context = createMockContext(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.EIGHTEEN_PLUS);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/age verification/);
    });
  });

  describe('authenticated user access', () => {
    it('should allow 18+ user to access 18+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.EIGHTEEN_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.EIGHTEEN_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow 18+ user to access 16+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.EIGHTEEN_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.SIXTEEN_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow 18+ user to access 0+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.EIGHTEEN_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.ZERO_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny 16+ user access to 18+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.SIXTEEN_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.EIGHTEEN_PLUS);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/18\+/);
    });

    it('should deny 12+ user access to 16+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.TWELVE_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.SIXTEEN_PLUS);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow 12+ user to access 12+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.TWELVE_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.TWELVE_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow 6+ user to access 0+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.SIX_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.ZERO_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny 6+ user access to 12+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.SIX_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.TWELVE_PLUS);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('error messages', () => {
    it('should include required age category in error message', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.TWELVE_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.EIGHTEEN_PLUS);

      expect(() => guard.canActivate(context)).toThrow(/18\+/);
    });

    it('should include user age category in error message', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.TWELVE_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.EIGHTEEN_PLUS);

      expect(() => guard.canActivate(context)).toThrow(/12\+/);
    });
  });

  describe('reflector integration', () => {
    it('should check age restriction on handler and class', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.EIGHTEEN_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.ZERO_PLUS);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(AGE_RESTRICTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle 0+ user accessing 0+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.ZERO_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.ZERO_PLUS);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny 0+ user access to 6+ content', () => {
      const user = { id: 'user-123', ageCategory: AgeCategory.ZERO_PLUS };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(AgeCategory.SIX_PLUS);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
