import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { VerificationStatus, VerificationMethod } from '@movie-platform/shared';

import { UsersService } from './users.service';
import { PrismaService } from '../../config/prisma.service';
import {
  createMockUser,
  createAdultUser,
} from '../../../test/factories/user.factory';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let configService: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userSession: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      userVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      playlist: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      playlistItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      partnerRelationship: {
        groupBy: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(4),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // findById Tests
  // ============================================
  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // findByEmail Tests
  // ============================================
  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = createAdultUser({ email: 'test@example.com' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should normalize email to lowercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.findByEmail('TEST@X.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@x.com' },
      });
    });

    it('should return null when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // findByReferralCode Tests
  // ============================================
  describe('findByReferralCode', () => {
    it('should return user by referral code', async () => {
      const mockUser = createAdultUser({ referralCode: 'ABC123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByReferralCode('ABC123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { referralCode: 'ABC123' },
      });
    });

    it('should normalize code to uppercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.findByReferralCode('abc123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { referralCode: 'ABC123' },
      });
    });
  });

  // ============================================
  // getProfile Tests
  // ============================================
  describe('getProfile', () => {
    it('should return sanitized profile without sensitive fields', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        email: 'test@example.com',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('referredById');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should convert bonusBalance Decimal to number', async () => {
      const mockUser = createMockUser({ bonusBalance: 150.5 });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(typeof result.bonusBalance).toBe('number');
      expect(result.bonusBalance).toBe(150.5);
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfile('non-existent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  // ============================================
  // updateProfile Tests
  // ============================================
  describe('updateProfile', () => {
    it('should update provided fields only', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      const updatedUser = { ...mockUser, firstName: 'NewName' };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-123', {
        firstName: 'NewName',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { firstName: 'NewName' },
      });
      expect(result.bonusBalance).toBe(Number(updatedUser.bonusBalance));
    });

    it('should return existing user when no fields provided', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await service.updateProfile('user-123', {});

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // changePassword Tests
  // ============================================
  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({});

      await service.changePassword('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'OldPassword123!',
        mockUser.passwordHash,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword456!', 4);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'new-hashed-password' },
      });
    });

    it('should throw BadRequestException on wrong current password', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword('user-123', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent', {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use BCRYPT_ROUNDS from config', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.update.mockResolvedValue({});

      await service.changePassword('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      });

      expect(configService.get).toHaveBeenCalledWith('BCRYPT_ROUNDS', 12);
    });

    it('should hash new password before storing', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
      prisma.user.update.mockResolvedValue({});

      await service.changePassword('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      });

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).not.toBe('NewPassword456!');
      expect(updateCall.data.passwordHash).toBe('hashed-new-password');
    });
  });

  // ============================================
  // submitVerification Tests
  // ============================================
  describe('submitVerification', () => {
    it('should create verification record for PAYMENT method', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      const verificationRecord = {
        id: 'verification-1',
        userId: 'user-123',
        method: VerificationMethod.PAYMENT,
        status: VerificationStatus.PENDING,
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userVerification.create.mockResolvedValue(verificationRecord);
      prisma.user.update.mockResolvedValue({});

      const result = await service.submitVerification('user-123', {
        method: VerificationMethod.PAYMENT,
      });

      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(result.method).toBe(VerificationMethod.PAYMENT);
      expect(prisma.userVerification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          method: VerificationMethod.PAYMENT,
          documentUrl: undefined,
          status: VerificationStatus.PENDING,
        },
      });
    });

    it('should create verification record for DOCUMENT with URL', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      const verificationRecord = {
        id: 'verification-1',
        userId: 'user-123',
        method: VerificationMethod.DOCUMENT,
        documentUrl: 'https://example.com/doc.jpg',
        status: VerificationStatus.PENDING,
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userVerification.create.mockResolvedValue(verificationRecord);
      prisma.user.update.mockResolvedValue({});

      const result = await service.submitVerification('user-123', {
        method: VerificationMethod.DOCUMENT,
        documentUrl: 'https://example.com/doc.jpg',
      });

      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(prisma.userVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentUrl: 'https://example.com/doc.jpg',
        }),
      });
    });

    it('should throw ConflictException when status is PENDING', async () => {
      const mockUser = createMockUser({
        verificationStatus: VerificationStatus.PENDING,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.submitVerification(mockUser.id, {
          method: VerificationMethod.PAYMENT,
        }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.submitVerification(mockUser.id, {
          method: VerificationMethod.PAYMENT,
        }),
      ).rejects.toThrow('already have a pending');
    });

    it('should throw ConflictException when already VERIFIED', async () => {
      const mockUser = createMockUser({
        verificationStatus: VerificationStatus.VERIFIED,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.submitVerification(mockUser.id, {
          method: VerificationMethod.PAYMENT,
        }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.submitVerification(mockUser.id, {
          method: VerificationMethod.PAYMENT,
        }),
      ).rejects.toThrow('already verified');
    });

    it('should throw BadRequestException when DOCUMENT without URL', async () => {
      const mockUser = createAdultUser({
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.submitVerification(mockUser.id, {
          method: VerificationMethod.DOCUMENT,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitVerification(mockUser.id, {
          method: VerificationMethod.DOCUMENT,
        }),
      ).rejects.toThrow('Document URL is required');
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.submitVerification('non-existent', {
          method: VerificationMethod.PAYMENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user verificationStatus to PENDING', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userVerification.create.mockResolvedValue({
        id: 'v-1',
        createdAt: new Date(),
      });
      prisma.user.update.mockResolvedValue({});

      await service.submitVerification('user-123', {
        method: VerificationMethod.PAYMENT,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          verificationStatus: VerificationStatus.PENDING,
          verificationMethod: VerificationMethod.PAYMENT,
        },
      });
    });
  });

  // ============================================
  // getVerificationStatus Tests
  // ============================================
  describe('getVerificationStatus', () => {
    it('should return status with latest verification record', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        verificationStatus: VerificationStatus.PENDING,
      });
      const verification = {
        id: 'v-1',
        userId: 'user-123',
        rejectionReason: null,
        createdAt: new Date('2024-01-01'),
        reviewedAt: null,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userVerification.findFirst.mockResolvedValue(verification);

      const result = await service.getVerificationStatus('user-123');

      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(result.submittedAt).toEqual(verification.createdAt);
      expect(prisma.userVerification.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return status without verification record', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userVerification.findFirst.mockResolvedValue(null);

      const result = await service.getVerificationStatus('user-123');

      expect(result.status).toBe(VerificationStatus.UNVERIFIED);
      expect(result.rejectionReason).toBeUndefined();
      expect(result.submittedAt).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getVerificationStatus('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getActiveSessions Tests
  // ============================================
  describe('getActiveSessions', () => {
    it('should return non-expired sessions', async () => {
      const sessions = [
        {
          id: 'session-1',
          deviceInfo: 'Chrome',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ];
      prisma.userSession.findMany.mockResolvedValue(sessions);

      const result = await service.getActiveSessions('user-123');

      expect(result).toEqual(sessions);
      expect(prisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          expiresAt: { gt: expect.any(Date) },
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no active sessions', async () => {
      prisma.userSession.findMany.mockResolvedValue([]);

      const result = await service.getActiveSessions('user-123');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // getReferralStats Tests
  // ============================================
  describe('getReferralStats', () => {
    it('should return stats with team levels', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        referralCode: 'REF123',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.count.mockResolvedValue(5);
      prisma.partnerRelationship.groupBy.mockResolvedValue([
        { level: 1, _count: 5 },
        { level: 2, _count: 3 },
        { level: 3, _count: 1 },
      ]);
      prisma.partnerRelationship.count.mockResolvedValue(9);

      const result = await service.getReferralStats('user-123');

      expect(result.referralCode).toBe('REF123');
      expect(result.directReferrals).toBe(5);
      expect(result.totalTeam).toBe(9);
      expect(result.teamByLevel).toEqual({ 1: 5, 2: 3, 3: 1 });
    });

    it('should return empty teamByLevel when no referrals', async () => {
      const mockUser = createAdultUser({ id: 'user-123' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.count.mockResolvedValue(0);
      prisma.partnerRelationship.groupBy.mockResolvedValue([]);
      prisma.partnerRelationship.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.directReferrals).toBe(0);
      expect(result.totalTeam).toBe(0);
      expect(result.teamByLevel).toEqual({});
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getReferralStats('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getWatchlist Tests
  // ============================================
  describe('getWatchlist', () => {
    const mockPlaylist = {
      id: 'playlist-1',
      userId: 'user-123',
      name: 'Избранное',
      isPublic: false,
    };

    it('should return paginated watchlist items', async () => {
      const items = [
        {
          contentId: 'content-1',
          order: 2,
          content: {
            id: 'content-1',
            title: 'Test Movie',
            slug: 'test-movie',
            contentType: 'SERIES',
            thumbnailUrl: '/thumb.jpg',
            duration: 3600,
            ageCategory: 'ZERO_PLUS',
          },
        },
      ];

      prisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.findMany.mockResolvedValue(items);
      prisma.playlistItem.count.mockResolvedValue(1);

      const result = await service.getWatchlist('user-123', 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should auto-create "Избранное" playlist when not found', async () => {
      prisma.playlist.findFirst.mockResolvedValue(null);
      prisma.playlist.create.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.findMany.mockResolvedValue([]);
      prisma.playlistItem.count.mockResolvedValue(0);

      await service.getWatchlist('user-123', 1, 10);

      expect(prisma.playlist.create).toHaveBeenCalledWith({
        data: { userId: 'user-123', name: 'Избранное', isPublic: false },
      });
    });

    it('should calculate totalPages correctly', async () => {
      prisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.findMany.mockResolvedValue([]);
      prisma.playlistItem.count.mockResolvedValue(25);

      const result = await service.getWatchlist('user-123', 1, 10);

      expect(result.totalPages).toBe(3);
    });
  });

  // ============================================
  // addToWatchlist Tests
  // ============================================
  describe('addToWatchlist', () => {
    const mockPlaylist = {
      id: 'playlist-1',
      userId: 'user-123',
      name: 'Избранное',
    };

    it('should add content with next order number', async () => {
      prisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.findUnique.mockResolvedValue(null);
      prisma.playlistItem.aggregate.mockResolvedValue({ _max: { order: 5 } });
      prisma.playlistItem.create.mockResolvedValue({});

      const result = await service.addToWatchlist('user-123', 'content-1');

      expect(result.message).toBe('Added to watchlist');
      expect(prisma.playlistItem.create).toHaveBeenCalledWith({
        data: {
          playlistId: 'playlist-1',
          contentId: 'content-1',
          order: 6,
        },
      });
    });

    it('should return message when already in watchlist', async () => {
      prisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.findUnique.mockResolvedValue({
        id: 'item-1',
        playlistId: 'playlist-1',
        contentId: 'content-1',
      });

      const result = await service.addToWatchlist('user-123', 'content-1');

      expect(result.message).toBe('Already in watchlist');
      expect(prisma.playlistItem.create).not.toHaveBeenCalled();
    });

    it('should handle first item with order 1', async () => {
      prisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.findUnique.mockResolvedValue(null);
      prisma.playlistItem.aggregate.mockResolvedValue({
        _max: { order: null },
      });
      prisma.playlistItem.create.mockResolvedValue({});

      await service.addToWatchlist('user-123', 'content-1');

      expect(prisma.playlistItem.create).toHaveBeenCalledWith({
        data: {
          playlistId: 'playlist-1',
          contentId: 'content-1',
          order: 1,
        },
      });
    });
  });

  // ============================================
  // removeFromWatchlist Tests
  // ============================================
  describe('removeFromWatchlist', () => {
    it('should remove content from watchlist', async () => {
      const mockPlaylist = { id: 'playlist-1' };
      prisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      prisma.playlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeFromWatchlist('user-123', 'content-1');

      expect(result.message).toBe('Removed from watchlist');
      expect(prisma.playlistItem.deleteMany).toHaveBeenCalledWith({
        where: { playlistId: 'playlist-1', contentId: 'content-1' },
      });
    });

    it('should throw NotFoundException when no playlist exists', async () => {
      prisma.playlist.findFirst.mockResolvedValue(null);

      await expect(
        service.removeFromWatchlist('user-123', 'content-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeFromWatchlist('user-123', 'content-1'),
      ).rejects.toThrow('Watchlist not found');
    });
  });

  // ============================================
  // terminateSession Tests
  // ============================================
  describe('terminateSession', () => {
    it('should delete session by id and userId', async () => {
      const session = { id: 'session-1', userId: 'user-123' };
      prisma.userSession.findFirst.mockResolvedValue(session);
      prisma.userSession.delete.mockResolvedValue(session);

      const result = await service.terminateSession('user-123', 'session-1');

      expect(result.message).toBe('Session terminated');
      expect(prisma.userSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1', userId: 'user-123' },
      });
      expect(prisma.userSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.userSession.findFirst.mockResolvedValue(null);

      await expect(
        service.terminateSession('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.terminateSession('user-123', 'non-existent'),
      ).rejects.toThrow('Session not found');
    });
  });

  // ============================================
  // terminateAllSessions Tests
  // ============================================
  describe('terminateAllSessions', () => {
    it('should delete all sessions for user', async () => {
      prisma.userSession.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.terminateAllSessions('user-123');

      expect(result.message).toBe('3 session(s) terminated');
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should exclude current session when provided', async () => {
      prisma.userSession.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.terminateAllSessions(
        'user-123',
        'current-session-id',
      );

      expect(result.message).toBe('2 session(s) terminated');
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          id: { not: 'current-session-id' },
        },
      });
    });
  });
});
