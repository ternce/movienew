import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';

export interface TransactionFilters {
  status?: string;
  type?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated transactions with optional filters.
   */
  async getTransactions(page: number, limit: number, filters?: TransactionFilters) {
    const where: Prisma.TransactionWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as TransactionStatus;
    }

    if (filters?.type) {
      where.type = filters.type as any;
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
      this.prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        ...t,
        amount: Number(t.amount),
        bonusAmountUsed: Number(t.bonusAmountUsed),
        userEmail: t.user.email,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single transaction by ID.
   */
  async getTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    return {
      ...transaction,
      amount: Number(transaction.amount),
      bonusAmountUsed: Number(transaction.bonusAmountUsed),
      userEmail: transaction.user.email,
    };
  }

  /**
   * Refund a transaction.
   */
  async refundTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Возврат возможен только для завершённых транзакций');
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.REFUNDED },
    });
  }

  /**
   * Get revenue statistics.
   */
  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRevenueResult, monthlyRevenueResult, transactionCount, refundCount] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: { status: TransactionStatus.COMPLETED },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            status: TransactionStatus.COMPLETED,
            createdAt: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.count({
          where: { status: TransactionStatus.COMPLETED },
        }),
        this.prisma.transaction.count({
          where: { status: TransactionStatus.REFUNDED },
        }),
      ]);

    return {
      totalRevenue: Number(totalRevenueResult._sum.amount) || 0,
      monthlyRevenue: Number(monthlyRevenueResult._sum.amount) || 0,
      transactionCount,
      refundCount,
    };
  }
}
