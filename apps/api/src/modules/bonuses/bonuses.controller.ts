import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TaxStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BonusesService } from './bonuses.service';
import {
  BonusBalanceDto,
  BonusQueryDto,
  BonusRateDto,
  BonusTransactionDto,
  BonusStatisticsDto,
  ExpiringBonusQueryDto,
  ExpiringBonusSummaryDto,
  MaxApplicableBonusDto,
  MaxApplicableQueryDto,
  WithdrawBonusDto,
  WithdrawalResultDto,
  WithdrawalPreviewDto,
} from './dto';

@ApiTags('bonuses')
@ApiBearerAuth()
@Controller('bonuses')
@UseGuards(JwtAuthGuard)
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current bonus balance and statistics' })
  @ApiResponse({ status: 200, type: BonusBalanceDto })
  async getBalance(@CurrentUser('id') userId: string): Promise<BonusBalanceDto> {
    return this.bonusesService.getBalance(userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get detailed bonus usage statistics' })
  @ApiResponse({ status: 200, type: BonusStatisticsDto })
  async getStatistics(@CurrentUser('id') userId: string): Promise<BonusStatisticsDto> {
    return this.bonusesService.getStatistics(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get bonus transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of bonus transactions',
    schema: {
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/BonusTransactionDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: BonusQueryDto,
  ): Promise<{ items: BonusTransactionDto[]; total: number; page: number; limit: number }> {
    return this.bonusesService.getTransactionHistory(userId, query);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get bonuses expiring within specified days' })
  @ApiResponse({ status: 200, type: ExpiringBonusSummaryDto })
  async getExpiringBonuses(
    @CurrentUser('id') userId: string,
    @Query() query: ExpiringBonusQueryDto,
  ): Promise<ExpiringBonusSummaryDto> {
    return this.bonusesService.getExpiringBonuses(userId, query.withinDays);
  }

  @Get('max-applicable')
  @ApiOperation({ summary: 'Calculate maximum bonus applicable for checkout' })
  @ApiResponse({ status: 200, type: MaxApplicableBonusDto })
  async getMaxApplicable(
    @CurrentUser('id') userId: string,
    @Query() query: MaxApplicableQueryDto,
  ): Promise<MaxApplicableBonusDto> {
    return this.bonusesService.calculateMaxApplicable(userId, query.orderTotal);
  }

  @Get('withdrawal-preview')
  @ApiOperation({ summary: 'Preview bonus withdrawal with tax calculation' })
  @ApiResponse({ status: 200, type: WithdrawalPreviewDto })
  async previewWithdrawal(
    @CurrentUser('id') userId: string,
    @Query('amount') amount: number,
    @Query('taxStatus') taxStatus: TaxStatus,
  ): Promise<WithdrawalPreviewDto> {
    return this.bonusesService.previewWithdrawal(userId, Number(amount), taxStatus);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw bonuses to currency' })
  @ApiResponse({ status: 201, type: WithdrawalResultDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance or below minimum amount' })
  async withdraw(
    @CurrentUser('id') userId: string,
    @Body() dto: WithdrawBonusDto,
  ): Promise<WithdrawalResultDto> {
    return this.bonusesService.withdrawBonusesToCurrency(userId, dto);
  }

  @Get('rate')
  @Public()
  @ApiOperation({ summary: 'Get current bonus conversion rate' })
  @ApiResponse({ status: 200, type: BonusRateDto })
  async getRate(): Promise<BonusRateDto | null> {
    return this.bonusesService.getCurrentRate();
  }
}
