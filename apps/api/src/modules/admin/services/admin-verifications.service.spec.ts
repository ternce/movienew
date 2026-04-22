/**
 * AdminVerificationsService Unit Tests
 *
 * Tests for admin verification queue functionality including:
 * - Getting verifications with filters and pagination
 * - Getting verification by ID
 * - Getting verification statistics
 * - Approving verifications
 * - Rejecting verifications
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VerificationStatus, VerificationMethod } from '@prisma/client';

import { AdminVerificationsService } from './admin-verifications.service';
import { PrismaService } from '../../../config/prisma.service';

describe('AdminVerificationsService', () => {
  let service: AdminVerificationsService;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
  };

  const mockVerification = {
    id: 'verification-123',
    userId: mockUser.id,
    method: VerificationMethod.DOCUMENT,
    documentUrl: 'https://example.com/doc.jpg',
    status: VerificationStatus.PENDING,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    user: mockUser,
    reviewedBy: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      userVerification: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminVerificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminVerificationsService>(AdminVerificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVerifications', () => {
    it('should return paginated verifications', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(25);
      mockPrisma.userVerification.findMany.mockResolvedValue([mockVerification]);

      const result = await service.getVerifications({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.userVerification.findMany.mockResolvedValue([]);

      await service.getVerifications({ status: VerificationStatus.PENDING });

      expect(mockPrisma.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: VerificationStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by method', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.userVerification.findMany.mockResolvedValue([]);

      await service.getVerifications({ method: VerificationMethod.DOCUMENT });

      expect(mockPrisma.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: VerificationMethod.DOCUMENT,
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.userVerification.findMany.mockResolvedValue([]);

      await service.getVerifications({ search: 'john' });

      expect(mockPrisma.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              OR: [
                { email: { contains: 'john', mode: 'insensitive' } },
                { firstName: { contains: 'john', mode: 'insensitive' } },
                { lastName: { contains: 'john', mode: 'insensitive' } },
              ],
            },
          }),
        }),
      );
    });

    it('should map verification to DTO correctly', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(1);
      mockPrisma.userVerification.findMany.mockResolvedValue([mockVerification]);

      const result = await service.getVerifications({});

      expect(result.items[0]).toMatchObject({
        id: mockVerification.id,
        userId: mockUser.id,
        userEmail: mockUser.email,
        userFirstName: mockUser.firstName,
        userLastName: mockUser.lastName,
        method: mockVerification.method,
        documentUrl: mockVerification.documentUrl,
        status: mockVerification.status,
      });
    });

    it('should order by status asc and createdAt desc', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.userVerification.findMany.mockResolvedValue([]);

      await service.getVerifications({});

      expect(mockPrisma.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        }),
      );
    });
  });

  describe('getVerificationById', () => {
    it('should return verification by ID', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(mockVerification);

      const result = await service.getVerificationById('verification-123');

      expect(result.id).toBe('verification-123');
      expect(result.userEmail).toBe(mockUser.email);
    });

    it('should throw NotFoundException when verification not found', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return verification statistics', async () => {
      mockPrisma.userVerification.count
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(50) // approved
        .mockResolvedValueOnce(5)  // rejected
        .mockResolvedValueOnce(65) // total
        .mockResolvedValueOnce(3); // overdue

      const result = await service.getStats();

      expect(result.pending).toBe(10);
      expect(result.approved).toBe(50);
      expect(result.rejected).toBe(5);
      expect(result.total).toBe(65);
      expect(result.overdueCount).toBe(3);
    });

    it('should filter pending verifications correctly', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(0);

      await service.getStats();

      expect(mockPrisma.userVerification.count).toHaveBeenCalledWith({
        where: { status: VerificationStatus.PENDING },
      });
    });

    it('should filter overdue verifications (older than 24 hours)', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(0);

      await service.getStats();

      // The 5th call is for overdue count
      const overdueCall = mockPrisma.userVerification.count.mock.calls[4];
      expect(overdueCall[0].where.status).toBe(VerificationStatus.PENDING);
      expect(overdueCall[0].where.createdAt).toHaveProperty('lt');
    });
  });

  describe('approveVerification', () => {
    it('should approve a pending verification', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique
        .mockResolvedValueOnce(pendingVerification)
        .mockResolvedValueOnce(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.VERIFIED,
        reviewedById: mockAdmin.id,
        reviewedAt: new Date(),
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.approveVerification('verification-123', mockAdmin.id);

      expect(result.status).toBe(VerificationStatus.VERIFIED);
    });

    it('should throw NotFoundException when verification not found', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.approveVerification('nonexistent', mockAdmin.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when verification is not pending', async () => {
      const approvedVerification = {
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
      };
      mockPrisma.userVerification.findUnique.mockResolvedValue(approvedVerification);

      await expect(
        service.approveVerification('verification-123', mockAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update user verification status', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.VERIFIED,
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.approveVerification('verification-123', mockAdmin.id);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockVerification.userId },
        data: { verificationStatus: VerificationStatus.VERIFIED },
      });
    });

    it('should create audit log on approval', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.VERIFIED,
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.approveVerification('verification-123', mockAdmin.id);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdmin.id,
          action: 'VERIFICATION_APPROVED',
          entityType: 'UserVerification',
          entityId: 'verification-123',
        }),
      });
    });
  });

  describe('rejectVerification', () => {
    it('should reject a pending verification', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.REJECTED,
        reviewedById: mockAdmin.id,
        reviewedAt: new Date(),
        rejectionReason: 'Document unclear',
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.rejectVerification(
        'verification-123',
        'Document unclear',
        mockAdmin.id,
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Document unclear');
    });

    it('should throw NotFoundException when verification not found', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectVerification('nonexistent', 'Reason', mockAdmin.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when verification is not pending', async () => {
      const rejectedVerification = {
        ...mockVerification,
        status: VerificationStatus.REJECTED,
      };
      mockPrisma.userVerification.findUnique.mockResolvedValue(rejectedVerification);

      await expect(
        service.rejectVerification('verification-123', 'Reason', mockAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reason is empty', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);

      await expect(
        service.rejectVerification('verification-123', '', mockAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reason is whitespace only', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);

      await expect(
        service.rejectVerification('verification-123', '   ', mockAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update user verification status to rejected', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.REJECTED,
        rejectionReason: 'Invalid document',
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.rejectVerification('verification-123', 'Invalid document', mockAdmin.id);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockVerification.userId },
        data: { verificationStatus: VerificationStatus.REJECTED },
      });
    });

    it('should create audit log on rejection', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.REJECTED,
        rejectionReason: 'Fraud suspected',
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.rejectVerification('verification-123', 'Fraud suspected', mockAdmin.id);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdmin.id,
          action: 'VERIFICATION_REJECTED',
          entityType: 'UserVerification',
          entityId: 'verification-123',
          newValue: expect.objectContaining({
            status: VerificationStatus.REJECTED,
            reason: 'Fraud suspected',
          }),
        }),
      });
    });

    it('should trim rejection reason', async () => {
      const pendingVerification = { ...mockVerification, status: VerificationStatus.PENDING };
      mockPrisma.userVerification.findUnique.mockResolvedValue(pendingVerification);
      mockPrisma.userVerification.update.mockResolvedValue({
        ...pendingVerification,
        status: VerificationStatus.REJECTED,
        rejectionReason: 'Trimmed reason',
        reviewedBy: mockAdmin,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.rejectVerification(
        'verification-123',
        '  Trimmed reason  ',
        mockAdmin.id,
      );

      expect(mockPrisma.userVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectionReason: 'Trimmed reason',
          }),
        }),
      );
    });
  });
});
