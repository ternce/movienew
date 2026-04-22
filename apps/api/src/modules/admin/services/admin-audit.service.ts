import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated audit logs with optional filters.
   */
  async getAuditLogs(page: number, limit: number, filters?: AuditLogFilters) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single audit log by ID.
   */
  async getAuditLog(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException('Запись аудита не найдена');
    }

    return log;
  }
}
