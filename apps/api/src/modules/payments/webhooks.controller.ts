import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBody,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaymentsService } from './payments.service';
import { YooKassaService } from './providers/yookassa/yookassa.service';
import { SbpService } from './providers/sbp/sbp.service';
import {
  SbpWebhookDto,
  WebhookResponseDto,
  YooKassaWebhookDto,
} from './dto';

@ApiTags('Webhooks')
@ApiExcludeController() // Hide from Swagger as these are internal
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly yooKassaService: YooKassaService,
    private readonly sbpService: SbpService,
  ) {}

  /**
   * YooKassa payment webhook handler.
   */
  @Post('yookassa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'YooKassa payment webhook' })
  async handleYooKassaWebhook(
    @Body() body: YooKassaWebhookDto,
    @Headers('x-webhook-signature') signature: string,
    @RawBody() rawBody: Buffer,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log(`YooKassa webhook received: ${body.event}`);

      // Verify signature
      const isValid = this.yooKassaService.verifyWebhookSignature(
        rawBody?.toString() || JSON.stringify(body),
        signature || '',
      );

      if (!isValid) {
        this.logger.warn('Invalid YooKassa webhook signature');
        return { success: false, error: 'Invalid signature' };
      }

      // Process payment notification
      if (body.event === 'payment.succeeded') {
        await this.paymentsService.completePayment(body.object.id, 'succeeded');
      } else if (body.event === 'payment.canceled') {
        await this.paymentsService.completePayment(body.object.id, 'canceled');
      } else if (body.event === 'payment.waiting_for_capture') {
        // For two-stage payments - we use auto-capture so this shouldn't occur
        this.logger.log(`Payment ${body.object.id} waiting for capture`);
      } else if (body.event === 'refund.succeeded') {
        this.logger.log(`Refund succeeded for payment: ${body.object.id}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing YooKassa webhook', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * SBP payment webhook handler.
   */
  @Post('sbp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SBP payment webhook' })
  async handleSbpWebhook(
    @Body() body: SbpWebhookDto,
    @Headers('x-sbp-signature') signature: string,
    @RawBody() rawBody: Buffer,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log(`SBP webhook received: ${body.eventType}`);

      // Verify signature
      const isValid = this.sbpService.verifyWebhookSignature(
        rawBody?.toString() || JSON.stringify(body),
        signature || '',
      );

      if (!isValid) {
        this.logger.warn('Invalid SBP webhook signature');
        return { success: false, error: 'Invalid signature' };
      }

      // Process payment notification
      if (body.status === 'SUCCESS') {
        await this.paymentsService.completePayment(body.paymentId, 'succeeded');
      } else if (body.status === 'FAILED') {
        await this.paymentsService.completePayment(body.paymentId, 'failed');
      } else if (body.status === 'EXPIRED') {
        await this.paymentsService.completePayment(body.paymentId, 'canceled');
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing SBP webhook', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Bank transfer confirmation webhook (manual or bank API).
   */
  @Post('bank-transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bank transfer confirmation webhook' })
  async handleBankTransferWebhook(
    @Body() body: { invoiceNumber: string; amount: number; transactionId?: string },
    @Headers('x-admin-secret') _adminSecret: string,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log(`Bank transfer webhook received for invoice: ${body.invoiceNumber}`);

      // This endpoint should only be called by admin or banking API
      // In production, implement proper authentication
      if (!body.transactionId) {
        return { success: false, error: 'Transaction ID required' };
      }

      await this.paymentsService.completePaymentById(body.transactionId);

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing bank transfer webhook', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Health check for webhook endpoints.
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
