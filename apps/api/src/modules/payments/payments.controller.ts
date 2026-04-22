import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import {
  InitiatePaymentDto,
  PaymentResultDto,
  PaymentStatusDto,
  RefundPaymentDto,
  TransactionDto,
  TransactionQueryDto,
  TransactionListResponseDto,
} from './dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiate a new payment.
   */
  @Post('initiate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a new payment' })
  @ApiOkResponse({ type: PaymentResultDto })
  async initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentResultDto> {
    return this.paymentsService.initiatePayment(userId, dto);
  }

  /**
   * Get payment status.
   */
  @Get('status/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiOkResponse({ type: PaymentStatusDto })
  async getPaymentStatus(
    @Param('transactionId') transactionId: string,
  ): Promise<PaymentStatusDto> {
    return this.paymentsService.getPaymentStatus(transactionId);
  }

  /**
   * Get user's transaction history.
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiOkResponse({ type: TransactionListResponseDto })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<{ items: TransactionDto[]; total: number; page: number; limit: number }> {
    return this.paymentsService.getTransactions(userId, query);
  }

  /**
   * Process a refund.
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a refund' })
  @ApiOkResponse({ type: TransactionDto })
  async processRefund(
    @CurrentUser('id') userId: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<TransactionDto> {
    return this.paymentsService.processRefund(userId, dto);
  }

  /**
   * Complete a payment by transaction ID (for testing/admin).
   */
  @Post('complete/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a pending payment (testing/admin)' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async completePayment(
    @Param('transactionId') transactionId: string,
  ): Promise<{ success: boolean }> {
    await this.paymentsService.completePaymentById(transactionId);
    return { success: true };
  }
}
