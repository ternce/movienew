import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, VerificationStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import {
  AdminVerificationDto,
  AdminVerificationQueryDto,
  AdminVerificationListDto,
  AdminVerificationStatsDto,
} from '../dto/verification';

@Injectable()
export class AdminVerificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get verifications with filters and pagination.
   */
  async getVerifications(query: AdminVerificationQueryDto): Promise<AdminVerificationListDto> {
    const { status, method, search, page = 1, limit = 20 } = query;

    const where: Prisma.UserVerificationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, verifications] = await Promise.all([
      this.prisma.userVerification.count({ where }),
      this.prisma.userVerification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { status: 'asc' }, // PENDING first
          { createdAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewedBy: {
            select: {
              email: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: verifications.map((v) => this.mapToDto(v)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get verification by ID.
   */
  async getVerificationById(id: string): Promise<AdminVerificationDto> {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException('Верификация не найдена');
    }

    return this.mapToDto(verification);
  }

  /**
   * Get verification queue statistics.
   */
  async getStats(): Promise<AdminVerificationStatsDto> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [pending, approved, rejected, total, overdueCount] = await Promise.all([
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.PENDING },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.VERIFIED },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.REJECTED },
      }),
      this.prisma.userVerification.count(),
      this.prisma.userVerification.count({
        where: {
          status: VerificationStatus.PENDING,
          createdAt: { lt: twentyFourHoursAgo },
        },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      total,
      overdueCount,
    };
  }

  /**
   * Approve a verification.
   */
  async approveVerification(id: string, adminId: string): Promise<AdminVerificationDto> {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Верификация не найдена');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Верификация должна иметь статус PENDING для одобрения, текущий статус: ${verification.status}`
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update verification status
      const updatedVerification = await tx.userVerification.update({
        where: { id },
        data: {
          status: VerificationStatus.VERIFIED,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewedBy: {
            select: {
              email: true,
            },
          },
        },
      });

      // Update user's verification status
      await tx.user.update({
        where: { id: verification.userId },
        data: { verificationStatus: VerificationStatus.VERIFIED },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'VERIFICATION_APPROVED',
          entityType: 'UserVerification',
          entityId: id,
          oldValue: { status: VerificationStatus.PENDING },
          newValue: { status: VerificationStatus.VERIFIED },
        },
      });

      return updatedVerification;
    });

    return this.mapToDto(updated);
  }

  /**
   * Reject a verification.
   */
  async rejectVerification(
    id: string,
    reason: string,
    adminId: string
  ): Promise<AdminVerificationDto> {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException('Верификация не найдена');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Верификация должна иметь статус PENDING для отклонения, текущий статус: ${verification.status}`
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Необходимо указать причину отклонения');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update verification status
      const updatedVerification = await tx.userVerification.update({
        where: { id },
        data: {
          status: VerificationStatus.REJECTED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewedBy: {
            select: {
              email: true,
            },
          },
        },
      });

      // Update user's verification status
      await tx.user.update({
        where: { id: verification.userId },
        data: { verificationStatus: VerificationStatus.REJECTED },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'VERIFICATION_REJECTED',
          entityType: 'UserVerification',
          entityId: id,
          oldValue: { status: VerificationStatus.PENDING },
          newValue: { status: VerificationStatus.REJECTED, reason },
        },
      });

      return updatedVerification;
    });

    return this.mapToDto(updated);
  }

  /**
   * Map verification to DTO.
   */
  private mapToDto(verification: any): AdminVerificationDto {
    return {
      id: verification.id,
      userId: verification.userId,
      userEmail: verification.user.email,
      userFirstName: verification.user.firstName,
      userLastName: verification.user.lastName,
      method: verification.method,
      documentUrl: verification.documentUrl,
      status: verification.status,
      reviewedByEmail: verification.reviewedBy?.email || null,
      reviewedAt: verification.reviewedAt,
      rejectionReason: verification.rejectionReason,
      createdAt: verification.createdAt,
    };
  }
}
