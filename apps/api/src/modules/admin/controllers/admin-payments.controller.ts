import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminPaymentsService } from '../services/admin-payments.service';

@ApiTags('Admin - Payments')
@ApiBearerAuth()
@Controller('admin/payments')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  /**
   * Get transactions with optional filters.
   */
  @Get('transactions')
  @ApiOperation({ summary: 'Get transactions list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.getTransactions(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
      { status, type, userId, dateFrom, dateTo },
    );
  }

  /**
   * Get transaction detail.
   */
  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction detail' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async getTransaction(@Param('id') id: string) {
    return this.paymentsService.getTransaction(id);
  }

  /**
   * Refund a transaction.
   */
  @Post('transactions/:id/refund')
  @ApiOperation({ summary: 'Refund a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async refundTransaction(@Param('id') id: string) {
    return this.paymentsService.refundTransaction(id);
  }

  /**
   * Get revenue stats.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get revenue statistics' })
  async getStats() {
    return this.paymentsService.getStats();
  }
}
