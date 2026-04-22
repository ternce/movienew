import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import {
  YooKassa,
  parsePaymentNotification,
  parseRefundNotification,
  CurrencyEnum,
  type PaymentNotification,
  type RefundNotification,
} from '@webzaytsev/yookassa-ts-sdk';
import type { Payments } from '@webzaytsev/yookassa-ts-sdk';
import type { Refunds } from '@webzaytsev/yookassa-ts-sdk';
import {
  YooKassaConfig,
  YooKassaPaymentRequest,
  YooKassaPaymentResponse,
  YooKassaRefundRequest,
  YooKassaRefundResponse,
} from './yookassa.types';

@Injectable()
export class YooKassaService {
  private readonly logger = new Logger(YooKassaService.name);
  private readonly config: YooKassaConfig;
  private readonly sdk: ReturnType<typeof YooKassa> | null;

  constructor(private readonly configService: ConfigService) {
    const shopId = this.configService.get<string>('YOOKASSA_SHOP_ID');
    const secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('YOOKASSA_WEBHOOK_SECRET');
    const isMockMode = this.configService.get<string>('YOOKASSA_MOCK_MODE', 'true') === 'true';

    // In production mode, require real credentials
    if (!isMockMode && (!shopId || !secretKey)) {
      throw new Error(
        'YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required when YOOKASSA_MOCK_MODE is not "true"',
      );
    }

    if (!isMockMode && !webhookSecret) {
      this.logger.warn('YOOKASSA_WEBHOOK_SECRET is not set - webhook signature verification will be ineffective');
    }

    this.config = {
      shopId: shopId || '',
      secretKey: secretKey || '',
      returnUrl: this.configService.get<string>('APP_URL', 'http://localhost:3000') + '/payment/callback',
      webhookSecret: webhookSecret || '',
      isMockMode,
    };

    // Initialize SDK only in production mode with valid credentials
    if (!this.config.isMockMode && shopId && secretKey) {
      this.sdk = YooKassa({
        shop_id: this.config.shopId,
        secret_key: this.config.secretKey,
      });
      this.logger.log('YooKassa SDK initialized in production mode');
    } else {
      this.sdk = null;
      if (isMockMode) {
        this.logger.log('YooKassa running in mock mode');
      } else {
        this.logger.warn('YooKassa credentials not configured — payments disabled');
      }
    }
  }

  /**
   * Create a new payment.
   * In mock mode, returns a fake payment response.
   */
  async createPayment(request: YooKassaPaymentRequest): Promise<YooKassaPaymentResponse> {
    if (this.config.isMockMode || !this.sdk) {
      return this.createMockPayment(request);
    }

    try {
      const payment = await this.sdk.payments.create({
        amount: {
          value: request.amount.value,
          currency: request.amount.currency as CurrencyEnum,
        },
        capture: request.capture,
        confirmation: {
          type: 'redirect',
          return_url: request.confirmation.return_url,
        },
        description: request.description,
        metadata: request.metadata as Record<string, string>,
      });

      this.logger.log(`Payment created: ${payment.id} for ${request.amount.value} ${request.amount.currency}`);

      return this.mapPaymentToResponse(payment);
    } catch (error) {
      this.logger.error('Failed to create payment', error);
      throw error;
    }
  }

  /**
   * Get payment status.
   */
  async getPaymentStatus(paymentId: string): Promise<YooKassaPaymentResponse> {
    if (this.config.isMockMode || !this.sdk) {
      return this.getMockPaymentStatus(paymentId);
    }

    try {
      const payment = await this.sdk.payments.load(paymentId);
      return this.mapPaymentToResponse(payment);
    } catch (error) {
      this.logger.error(`Failed to get payment status: ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Create a refund.
   */
  async createRefund(request: YooKassaRefundRequest): Promise<YooKassaRefundResponse> {
    if (this.config.isMockMode || !this.sdk) {
      return this.createMockRefund(request);
    }

    try {
      const refund = await this.sdk.refunds.create({
        payment_id: request.payment_id,
        amount: {
          value: request.amount.value,
          currency: request.amount.currency as CurrencyEnum,
        },
        description: request.description,
      });

      this.logger.log(`Refund created: ${refund.id} for payment ${request.payment_id}`);

      return this.mapRefundToResponse(refund);
    } catch (error) {
      this.logger.error('Failed to create refund', error);
      throw error;
    }
  }

  /**
   * Parse and validate webhook notification (type-safe).
   */
  parsePaymentWebhook(body: unknown): PaymentNotification | null {
    try {
      return parsePaymentNotification(body);
    } catch (error) {
      this.logger.warn('Failed to parse payment notification', error);
      return null;
    }
  }

  /**
   * Parse and validate refund webhook notification (type-safe).
   */
  parseRefundWebhook(body: unknown): RefundNotification | null {
    try {
      return parseRefundNotification(body);
    } catch (error) {
      this.logger.warn('Failed to parse refund notification', error);
      return null;
    }
  }

  /**
   * Verify webhook signature.
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (this.config.isMockMode) {
      // In mock mode, accept any signature
      return true;
    }

    // YooKassa uses HMAC-SHA256 for webhook signatures
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Get return URL for redirects.
   */
  getReturnUrl(transactionId: string): string {
    return `${this.config.returnUrl}?transactionId=${transactionId}`;
  }

  /**
   * Check if running in mock mode.
   */
  isMockMode(): boolean {
    return this.config.isMockMode;
  }

  // ============ Mapping Methods ============

  private mapPaymentToResponse(payment: Payments.IPayment): YooKassaPaymentResponse {
    return {
      id: payment.id,
      status: payment.status as YooKassaPaymentResponse['status'],
      paid: payment.paid,
      amount: {
        value: payment.amount.value,
        currency: payment.amount.currency,
      },
      confirmation: payment.confirmation?.type === 'redirect'
        ? {
            type: 'redirect',
            confirmation_url: (payment.confirmation as { confirmation_url?: string }).confirmation_url || '',
          }
        : undefined,
      created_at: payment.created_at,
      description: payment.description,
      metadata: payment.metadata as Record<string, any>,
      refundable: payment.refundable,
    };
  }

  private mapRefundToResponse(refund: Refunds.IRefund): YooKassaRefundResponse {
    return {
      id: refund.id,
      status: refund.status as YooKassaRefundResponse['status'],
      amount: {
        value: refund.amount.value,
        currency: refund.amount.currency,
      },
      payment_id: refund.payment_id,
      created_at: refund.created_at,
      description: refund.description,
    };
  }

  // ============ Mock Methods ============

  private createMockPayment(request: YooKassaPaymentRequest): YooKassaPaymentResponse {
    const paymentId = `mock_${randomUUID()}`;
    this.logger.log(`[MOCK] Creating payment: ${paymentId} for ${request.amount.value} ${request.amount.currency}`);

    return {
      id: paymentId,
      status: 'pending',
      paid: false,
      amount: request.amount,
      confirmation: {
        type: 'redirect',
        confirmation_url: `https://mock-yookassa.local/confirm/${paymentId}`,
      },
      created_at: new Date().toISOString(),
      description: request.description,
      metadata: request.metadata,
      refundable: false,
    };
  }

  private getMockPaymentStatus(paymentId: string): YooKassaPaymentResponse {
    this.logger.log(`[MOCK] Getting payment status: ${paymentId}`);

    // In mock mode, simulate a succeeded payment
    return {
      id: paymentId,
      status: 'succeeded',
      paid: true,
      amount: {
        value: '499.00',
        currency: 'RUB',
      },
      created_at: new Date().toISOString(),
      refundable: true,
    };
  }

  private createMockRefund(request: YooKassaRefundRequest): YooKassaRefundResponse {
    const refundId = `mock_refund_${randomUUID()}`;
    this.logger.log(`[MOCK] Creating refund: ${refundId} for payment ${request.payment_id}`);

    return {
      id: refundId,
      status: 'succeeded',
      amount: request.amount,
      payment_id: request.payment_id,
      created_at: new Date().toISOString(),
      description: request.description,
    };
  }

  /**
   * Simulate a successful payment (for testing).
   * This can be called manually to test the webhook flow.
   */
  async simulateSuccessfulPayment(transactionId: string): Promise<void> {
    if (!this.config.isMockMode) {
      this.logger.warn('simulateSuccessfulPayment only works in mock mode');
      return;
    }

    this.logger.log(`[MOCK] Simulating successful payment for transaction: ${transactionId}`);
    // The webhook controller should handle processing
  }
}
