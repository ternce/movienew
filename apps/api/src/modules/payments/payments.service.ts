import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentMethodType,
  Prisma,
  TransactionStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../config/prisma.service';
import { BonusesService } from '../bonuses/bonuses.service';
import { PartnersService } from '../partners/partners.service';
import { YooKassaService } from './providers/yookassa/yookassa.service';
import { SbpService } from './providers/sbp/sbp.service';
import { BankTransferService } from './providers/bank-transfer/bank-transfer.service';
import {
  InitiatePaymentDto,
  PaymentResultDto,
  PaymentStatusDto,
  RefundPaymentDto,
  TransactionDto,
  TransactionQueryDto,
} from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bonusesService: BonusesService,
    private readonly partnersService: PartnersService,
    private readonly yooKassaService: YooKassaService,
    private readonly sbpService: SbpService,
    private readonly bankTransferService: BankTransferService,
  ) {}

  /**
   * Initiate a new payment.
   */
  async initiatePayment(
    userId: string,
    dto: InitiatePaymentDto,
  ): Promise<PaymentResultDto> {
    const bonusAmount = dto.bonusAmount || 0;

    // Validate bonus amount if provided
    if (bonusAmount > 0) {
      const isValid = await this.bonusesService.validateSpend(userId, bonusAmount);
      if (!isValid) {
        throw new BadRequestException('Недостаточно бонусов');
      }
    }

    // Calculate actual amount to pay
    const amountToPay = Math.max(0, dto.amount - bonusAmount);

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        currency: 'RUB',
        bonusAmountUsed: bonusAmount,
        paymentMethod: dto.paymentMethod,
        status: TransactionStatus.PENDING,
        metadata: {
          referenceId: dto.referenceId,
          returnUrl: dto.returnUrl,
          ...dto.metadata,
        },
      },
    });

    // If amount to pay is 0 (fully covered by bonus), complete immediately
    if (amountToPay <= 0) {
      return this.completeZeroAmountPayment(transaction.id, userId, bonusAmount);
    }

    // Route to appropriate payment provider
    const result = await this.routeToProvider(
      transaction.id,
      dto.paymentMethod,
      amountToPay,
      dto,
    );

    return {
      transactionId: transaction.id,
      status: TransactionStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      bonusAmountUsed: bonusAmount,
      amountToPay,
      ...result,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Get payment status.
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    return {
      transactionId: transaction.id,
      status: transaction.status,
      type: transaction.type,
      amount: Number(transaction.amount),
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt || undefined,
    };
  }

  /**
   * Get user's transaction history.
   */
  async getTransactions(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<{ items: TransactionDto[]; total: number; page: number; limit: number }> {
    const { type, status, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.TransactionWhereInput = { userId };

    if (type) where.type = type;
    if (status) where.status = status;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [total, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        bonusAmountUsed: Number(t.bonusAmountUsed),
        paymentMethod: t.paymentMethod,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt || undefined,
        metadata: t.metadata as Record<string, unknown>,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Process a refund.
   */
  async processRefund(userId: string, dto: RefundPaymentDto): Promise<TransactionDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException('Транзакция не принадлежит пользователю');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Возврат возможен только для завершённых транзакций');
    }

    const refundAmount = dto.amount || Number(transaction.amount);

    if (refundAmount > Number(transaction.amount)) {
      throw new BadRequestException('Сумма возврата превышает сумму транзакции');
    }

    // Process refund through payment provider
    if (transaction.paymentMethod === PaymentMethodType.CARD && transaction.externalPaymentId) {
      await this.yooKassaService.createRefund({
        payment_id: transaction.externalPaymentId,
        amount: {
          value: refundAmount.toFixed(2),
          currency: 'RUB',
        },
        description: dto.reason,
      });
    }

    // Update transaction status
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: dto.transactionId },
      data: {
        status: TransactionStatus.REFUNDED,
        metadata: {
          ...(transaction.metadata as object),
          refundedAt: new Date().toISOString(),
          refundAmount,
          refundReason: dto.reason,
        },
      },
    });

    // Restore bonus if used
    if (Number(transaction.bonusAmountUsed) > 0) {
      await this.bonusesService.earnBonuses({
        userId,
        amount: Number(transaction.bonusAmountUsed),
        source: 'REFUND',
        referenceId: transaction.id,
        referenceType: 'Transaction',
      });
    }

    return {
      id: updatedTransaction.id,
      type: updatedTransaction.type,
      amount: Number(updatedTransaction.amount),
      currency: updatedTransaction.currency,
      bonusAmountUsed: Number(updatedTransaction.bonusAmountUsed),
      paymentMethod: updatedTransaction.paymentMethod,
      status: updatedTransaction.status,
      createdAt: updatedTransaction.createdAt,
      completedAt: updatedTransaction.completedAt || undefined,
      metadata: updatedTransaction.metadata as Record<string, any>,
    };
  }

  /**
   * Complete a payment (called by webhook handlers).
   */
  async completePayment(
    externalPaymentId: string,
    status: 'succeeded' | 'failed' | 'canceled',
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { externalPaymentId },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for external payment: ${externalPaymentId}`);
      return;
    }

    // Skip if already processed (idempotency)
    if (transaction.status !== TransactionStatus.PENDING) {
      this.logger.log(`Transaction ${transaction.id} already processed, skipping`);
      return;
    }

    if (status === 'succeeded') {
      await this.markPaymentCompleted(transaction.id, transaction.userId);
    } else {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: status === 'failed' ? TransactionStatus.FAILED : TransactionStatus.CANCELLED,
        },
      });
    }
  }

  /**
   * Complete a payment by transaction ID (internal use).
   */
  async completePaymentById(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      this.logger.log(`Transaction ${transactionId} already processed`);
      return;
    }

    await this.markPaymentCompleted(transactionId, transaction.userId);
  }

  // ============ Private Helper Methods ============

  private async routeToProvider(
    transactionId: string,
    paymentMethod: PaymentMethodType,
    amount: number,
    dto: InitiatePaymentDto,
  ): Promise<Partial<PaymentResultDto>> {
    const returnUrl = dto.returnUrl || this.yooKassaService.getReturnUrl(transactionId);

    switch (paymentMethod) {
      case PaymentMethodType.CARD: {
        const payment = await this.yooKassaService.createPayment({
          amount: {
            value: amount.toFixed(2),
            currency: 'RUB',
          },
          capture: true,
          confirmation: {
            type: 'redirect',
            return_url: returnUrl,
          },
          description: `Оплата ${dto.type}`,
          metadata: {
            transactionId,
            referenceId: dto.referenceId,
          },
        });

        // Update transaction with external payment ID
        await this.prisma.transaction.update({
          where: { id: transactionId },
          data: { externalPaymentId: payment.id },
        });

        return {
          paymentUrl: payment.confirmation?.confirmation_url,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };
      }

      case PaymentMethodType.SBP: {
        const payment = await this.sbpService.createPayment({
          amount,
          currency: 'RUB',
          transactionId,
          description: `Оплата ${dto.type}`,
          metadata: { referenceId: dto.referenceId },
        });

        // Update transaction with external payment ID
        await this.prisma.transaction.update({
          where: { id: transactionId },
          data: { externalPaymentId: payment.paymentId },
        });

        return {
          qrCodeUrl: payment.qrCodeUrl,
          expiresAt: payment.expiresAt,
        };
      }

      case PaymentMethodType.BANK_TRANSFER: {
        const invoice = this.bankTransferService.createInvoice(
          transactionId,
          amount,
          'RUB',
          `Оплата ${dto.type}`,
        );

        // Create invoice record
        const invoiceRecord = await this.prisma.invoice.create({
          data: {
            userId: (await this.prisma.transaction.findUnique({ where: { id: transactionId } }))!
              .userId,
            transactionId,
            amount,
            currency: 'RUB',
            dueDate: invoice.dueDate,
            bankDetails: (invoice.bankDetails ?? {}) as unknown as Prisma.InputJsonValue,
            qrCodeUrl: this.bankTransferService.generateQrCode(invoice),
            status: InvoiceStatus.PENDING,
          },
        });

        return {
          bankDetails: invoice.bankDetails,
          invoiceId: invoiceRecord.id,
          expiresAt: invoice.dueDate,
        };
      }

      case PaymentMethodType.QR: {
        // QR payment uses SBP by default
        const payment = await this.sbpService.createPayment({
          amount,
          currency: 'RUB',
          transactionId,
          description: `Оплата ${dto.type}`,
        });

        await this.prisma.transaction.update({
          where: { id: transactionId },
          data: { externalPaymentId: payment.paymentId },
        });

        return {
          qrCodeUrl: payment.qrCodeUrl,
          expiresAt: payment.expiresAt,
        };
      }

      default:
        throw new BadRequestException(`Неподдерживаемый метод оплаты: ${paymentMethod}`);
    }
  }

  private async completeZeroAmountPayment(
    transactionId: string,
    userId: string,
    bonusAmount: number,
  ): Promise<PaymentResultDto> {
    // Deduct bonus and complete transaction in one atomic operation
    await this.prisma.$transaction(async (tx) => {
      // Deduct bonus
      await this.bonusesService.spendBonuses(
        {
          userId,
          amount: bonusAmount,
          referenceId: transactionId,
          referenceType: 'Transaction',
        },
        tx as unknown as Prisma.TransactionClient,
      );

      // Mark transaction as completed
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    return {
      transactionId,
      status: TransactionStatus.COMPLETED,
      paymentMethod: transaction!.paymentMethod,
      amount: Number(transaction!.amount),
      bonusAmountUsed: bonusAmount,
      amountToPay: 0,
      createdAt: transaction!.createdAt,
    };
  }

  private async markPaymentCompleted(transactionId: string, userId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return;

    await this.prisma.$transaction(async (tx) => {
      // Deduct bonus if used
      const bonusUsed = Number(transaction.bonusAmountUsed);
      if (bonusUsed > 0) {
        await this.bonusesService.spendBonuses(
          {
            userId,
            amount: bonusUsed,
            referenceId: transactionId,
            referenceType: 'Transaction',
          },
          tx as unknown as Prisma.TransactionClient,
        );
      }

      // Update transaction status
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Create partner commissions
      await this.partnersService.calculateAndCreateCommissions(
        transactionId,
        userId,
        new Decimal(transaction.amount.toString()),
      );

      // Update invoice if exists
      await tx.invoice.updateMany({
        where: { transactionId, status: InvoiceStatus.PENDING },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      // Log to audit trail
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_COMPLETED',
          entityType: 'Transaction',
          entityId: transactionId,
          newValue: {
            amount: transaction.amount.toString(),
            type: transaction.type,
            paymentMethod: transaction.paymentMethod,
          },
        },
      });
    });

    this.logger.log(`Payment completed: ${transactionId}`);
  }
}
