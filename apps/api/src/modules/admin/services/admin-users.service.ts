import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole, VerificationStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import { BonusesService } from '../../bonuses/bonuses.service';

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  bonusBalance: number;
  createdAt: Date;
}

export interface AdminUserQueryDto {
  search?: string;
  role?: UserRole;
  verificationStatus?: VerificationStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bonusesService: BonusesService,
  ) {}

  /**
   * Get users with filters and pagination.
   */
  async getUsers(
    query: AdminUserQueryDto,
  ): Promise<{ items: AdminUserDto[]; total: number; page: number; limit: number }> {
    const { search, role, verificationStatus, isActive, page = 1, limit = 20 } = query;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role;
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (isActive !== undefined) where.isActive = isActive;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: users.map((u) => this.mapToDto(u)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get user by ID.
   */
  async getUserById(userId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.mapToDto(user);
  }

  /**
   * Update user role.
   */
  async updateUserRole(userId: string, role: UserRole, adminId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { role },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: userId,
          oldValue: { role: user.role },
          newValue: { role },
        },
      });

      return updatedUser;
    });

    return this.mapToDto(updated);
  }

  /**
   * Deactivate/Activate user.
   */
  async toggleActive(userId: string, active: boolean, adminId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Невозможно деактивировать администраторов');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { isActive: active },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          entityType: 'User',
          entityId: userId,
        },
      });

      return updatedUser;
    });

    return this.mapToDto(updated);
  }

  /**
   * Adjust user's bonus balance.
   */
  async adjustBonusBalance(
    userId: string,
    amount: number,
    reason: string,
    adminId: string,
  ): Promise<AdminUserDto> {
    await this.bonusesService.adjustBalance(userId, amount, reason, adminId);

    return this.getUserById(userId);
  }

  /**
   * Map user to DTO.
   */
  private mapToDto(user: any): AdminUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      verificationStatus: user.verificationStatus,
      isActive: user.isActive,
      bonusBalance: Number(user.bonusBalance),
      createdAt: user.createdAt,
    };
  }
}
