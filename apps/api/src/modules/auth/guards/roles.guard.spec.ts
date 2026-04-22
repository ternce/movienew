import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

// Define UserRole enum for tests
enum UserRole {
  GUEST = 'GUEST',
  BUYER = 'BUYER',
  PARTNER = 'PARTNER',
  MINOR = 'MINOR',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
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
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      const context = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when roles array is empty', () => {
      const context = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const context = createMockContext(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied: authentication required',
      );
    });

    it('should return true when user has required role', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      const user = { id: 'user-123', role: UserRole.MODERATOR };
      const context = createMockContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.MODERATOR]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      const user = { id: 'user-123', role: UserRole.BUYER };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/requires one of the following roles/);
    });

    it('should check roles against handler and class', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('role hierarchy', () => {
    it('should not implicitly grant access based on role hierarchy', () => {
      // ADMIN should not automatically have MODERATOR access unless explicitly granted
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MODERATOR]);

      // This should fail because we require exact role match, not hierarchy
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should work with multiple roles including user role', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = createMockContext(user);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.MODERATOR, UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle MINOR role correctly', () => {
      const user = { id: 'user-123', role: UserRole.MINOR };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MINOR]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle PARTNER role correctly', () => {
      const user = { id: 'user-123', role: UserRole.PARTNER };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PARTNER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle GUEST role correctly', () => {
      const user = { id: 'user-123', role: UserRole.GUEST };
      const context = createMockContext(user);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.GUEST]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
