/**
 * AdminUsersService Unit Tests
 *
 * Tests for admin user management including:
 * - User listing with filters and pagination
 * - User lookup by ID
 * - Role updates with audit logging
 * - User activation/deactivation
 * - Bonus balance adjustments
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole, VerificationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../../config/prisma.service';
import { BonusesService } from '../../bonuses/bonuses.service';
import {
  createMockUser,
  createAdminUser,
  createAdultUser,
  createPartnerUser,
} from '../../../../test/factories/user.factory';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let mockPrisma: any;
  let mockBonusesService: any;

  const adminUser = createAdminUser();
  const adminId = adminUser.id;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockBonusesService = {
      adjustBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BonusesService, useValue: mockBonusesService },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [
        createAdultUser(),
        createAdultUser(),
      ];

      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.getUsers({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by search term', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ search: 'john' });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ],
        }),
      });
    });

    it('should filter by role', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ role: UserRole.PARTNER });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ role: UserRole.PARTNER }),
      });
    });

    it('should filter by verification status', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ verificationStatus: VerificationStatus.VERIFIED });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          verificationStatus: VerificationStatus.VERIFIED,
        }),
      });
    });

    it('should filter by isActive status', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ isActive: false });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ isActive: false }),
      });
    });

    it('should use default pagination values', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getUsers({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate correct skip value for pagination', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ page: 3, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should map user to DTO correctly', async () => {
      const user = createAdultUser({
        bonusBalance: 5000,
      });

      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([user]);

      const result = await service.getUsers({});

      expect(result.items[0]).toEqual({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isActive: user.isActive,
        bonusBalance: 5000,
        createdAt: user.createdAt,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const user = createAdultUser({ id: 'user-123' });

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserById('user-123');

      expect(result.id).toBe('user-123');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should map Decimal bonusBalance to number', async () => {
      const user = {
        ...createAdultUser(),
        bonusBalance: new Decimal(12345),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserById(user.id);

      expect(typeof result.bonusBalance).toBe('number');
      expect(result.bonusBalance).toBe(12345);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const user = createAdultUser({ id: 'user-123' });
      const updatedUser = { ...user, role: UserRole.PARTNER };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole('user-123', UserRole.PARTNER, adminId);

      expect(result.role).toBe(UserRole.PARTNER);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('non-existent', UserRole.PARTNER, adminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create audit log entry', async () => {
      const user = createAdultUser({ id: 'user-123' });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, role: UserRole.PARTNER });

      await service.updateUserRole('user-123', UserRole.PARTNER, adminId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminId,
          action: 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: 'user-123',
          oldValue: { role: user.role },
          newValue: { role: UserRole.PARTNER },
        }),
      });
    });

    it('should execute in transaction', async () => {
      const user = createAdultUser();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, role: UserRole.PARTNER });

      await service.updateUserRole(user.id, UserRole.PARTNER, adminId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should update from BUYER to ADMIN', async () => {
      const user = createAdultUser({ id: 'user-123' });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      const result = await service.updateUserRole('user-123', UserRole.ADMIN, adminId);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should update from PARTNER to MODERATOR', async () => {
      const user = createPartnerUser({ id: 'user-123' });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, role: UserRole.MODERATOR });

      const result = await service.updateUserRole('user-123', UserRole.MODERATOR, adminId);

      expect(result.role).toBe(UserRole.MODERATOR);
    });
  });

  describe('toggleActive', () => {
    it('should deactivate user', async () => {
      const user = createAdultUser({ id: 'user-123', isActive: true });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, isActive: false });

      const result = await service.toggleActive('user-123', false, adminId);

      expect(result.isActive).toBe(false);
    });

    it('should activate user', async () => {
      const user = createAdultUser({ id: 'user-123', isActive: false });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, isActive: true });

      const result = await service.toggleActive('user-123', true, adminId);

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleActive('non-existent', false, adminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deactivating admin', async () => {
      const admin = createAdminUser({ id: 'admin-123' });

      mockPrisma.user.findUnique.mockResolvedValue(admin);

      await expect(
        service.toggleActive('admin-123', false, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when activating admin users', async () => {
      // Admin protection applies to both activation and deactivation
      const admin = { ...createAdminUser({ id: 'admin-123' }), isActive: false };

      mockPrisma.user.findUnique.mockResolvedValue(admin);

      // Cannot toggle admin users at all
      await expect(
        service.toggleActive('admin-123', true, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit log for deactivation', async () => {
      const user = createAdultUser({ id: 'user-123' });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, isActive: false });

      await service.toggleActive('user-123', false, adminId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminId,
          action: 'USER_DEACTIVATED',
          entityType: 'User',
          entityId: 'user-123',
        }),
      });
    });

    it('should create audit log for activation', async () => {
      const user = createAdultUser({ id: 'user-123', isActive: false });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, isActive: true });

      await service.toggleActive('user-123', true, adminId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminId,
          action: 'USER_ACTIVATED',
          entityType: 'User',
          entityId: 'user-123',
        }),
      });
    });

    it('should execute in transaction', async () => {
      const user = createAdultUser();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, isActive: false });

      await service.toggleActive(user.id, false, adminId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('adjustBonusBalance', () => {
    it('should delegate to BonusesService', async () => {
      const user = createAdultUser({ id: 'user-123', bonusBalance: 1000 });
      const updatedUser = { ...user, bonusBalance: new Decimal(1500) };

      mockBonusesService.adjustBalance.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(updatedUser);

      await service.adjustBonusBalance('user-123', 500, 'Admin adjustment', adminId);

      expect(mockBonusesService.adjustBalance).toHaveBeenCalledWith(
        'user-123',
        500,
        'Admin adjustment',
        adminId,
      );
    });

    it('should return updated user after adjustment', async () => {
      const user = createAdultUser({ id: 'user-123' });
      const updatedUser = { ...user, bonusBalance: new Decimal(5000) };

      mockBonusesService.adjustBalance.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(updatedUser);

      const result = await service.adjustBonusBalance('user-123', 5000, 'Promotion', adminId);

      expect(result.bonusBalance).toBe(5000);
    });

    it('should support negative adjustments', async () => {
      const user = createAdultUser({ id: 'user-123' });
      const updatedUser = { ...user, bonusBalance: new Decimal(500) };

      mockBonusesService.adjustBalance.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(updatedUser);

      await service.adjustBonusBalance('user-123', -500, 'Penalty', adminId);

      expect(mockBonusesService.adjustBalance).toHaveBeenCalledWith(
        'user-123',
        -500,
        'Penalty',
        adminId,
      );
    });

    it('should pass admin ID for audit trail', async () => {
      const user = createAdultUser({ id: 'user-123' });

      mockBonusesService.adjustBalance.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await service.adjustBonusBalance('user-123', 1000, 'Test', 'admin-456');

      expect(mockBonusesService.adjustBalance).toHaveBeenCalledWith(
        'user-123',
        1000,
        'Test',
        'admin-456',
      );
    });
  });

  describe('DTO Mapping', () => {
    it('should map all user fields correctly', async () => {
      const createdAt = new Date('2025-01-01');
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTNER,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
        bonusBalance: new Decimal(9999),
        createdAt,
        // Extra fields that should NOT be in DTO
        passwordHash: 'secret',
        dateOfBirth: new Date('1990-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserById('user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PARTNER,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
        bonusBalance: 9999,
        createdAt,
      });

      // Ensure sensitive fields are NOT included
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('dateOfBirth');
    });

    it('should handle zero bonus balance', async () => {
      const user = {
        ...createAdultUser(),
        bonusBalance: new Decimal(0),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getUserById(user.id);

      expect(result.bonusBalance).toBe(0);
    });
  });
});
