import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface SbpPaymentRequest {
  amount: number;
  currency: string;
  transactionId: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface SbpPaymentResponse {
  paymentId: string;
  qrCodeUrl: string;
  qrCodeData: string;
  expiresAt: Date;
  status: 'pending' | 'succeeded' | 'failed' | 'expired';
}

@Injectable()
export class SbpService {
  private readonly logger = new Logger(SbpService.name);
  private readonly isMockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isMockMode = this.configService.get<string>('SBP_MOCK_MODE', 'true') === 'true';
  }

  /**
   * Create an SBP payment with QR code.
   */
  async createPayment(request: SbpPaymentRequest): Promise<SbpPaymentResponse> {
    if (this.isMockMode) {
      return this.createMockPayment(request);
    }

    // Real SBP API integration would go here
    throw new Error('Real SBP integration not implemented');
  }

  /**
   * Get payment status.
   */
  async getPaymentStatus(paymentId: string): Promise<SbpPaymentResponse> {
    if (this.isMockMode) {
      return this.getMockPaymentStatus(paymentId);
    }

    throw new Error('Real SBP integration not implemented');
  }

  /**
   * Verify webhook signature.
   */
  verifyWebhookSignature(_body: string, _signature: string): boolean {
    if (this.isMockMode) {
      return true;
    }

    // Real signature verification would go here
    return false;
  }

  // ============ Mock Methods ============

  private createMockPayment(request: SbpPaymentRequest): SbpPaymentResponse {
    const paymentId = `sbp_${randomUUID()}`;
    this.logger.log(`[MOCK] Creating SBP payment: ${paymentId} for ${request.amount} ${request.currency}`);

    // Generate a mock QR code URL (in real implementation, this would be a real NSPK QR)
    const qrCodeData = `https://qr.nspk.ru/mock/${paymentId}?sum=${request.amount * 100}&cur=RUB`;

    return {
      paymentId,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`,
      qrCodeData,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      status: 'pending',
    };
  }

  private getMockPaymentStatus(paymentId: string): SbpPaymentResponse {
    this.logger.log(`[MOCK] Getting SBP payment status: ${paymentId}`);

    return {
      paymentId,
      qrCodeUrl: '',
      qrCodeData: '',
      expiresAt: new Date(),
      status: 'succeeded',
    };
  }

  /**
   * Simulate a successful payment (for testing).
   */
  async simulateSuccessfulPayment(paymentId: string): Promise<void> {
    if (!this.isMockMode) {
      this.logger.warn('simulateSuccessfulPayment only works in mock mode');
      return;
    }

    this.logger.log(`[MOCK] Simulating successful SBP payment: ${paymentId}`);
  }
}
