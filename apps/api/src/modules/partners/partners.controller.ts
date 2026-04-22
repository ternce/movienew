import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TaxStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PartnersService } from './partners.service';
import {
  AvailableBalanceDto,
  CommissionDto,
  CommissionQueryDto,
  CreateWithdrawalDto,
  PartnerDashboardDto,
  PartnerLevelDto,
  ReferralTreeDto,
  TaxCalculationDto,
  WithdrawalDto,
  WithdrawalQueryDto,
} from './dto';

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  /**
   * Get partner dashboard with statistics.
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get partner dashboard statistics' })
  @ApiOkResponse({ type: PartnerDashboardDto })
  async getDashboard(@CurrentUser('id') userId: string): Promise<PartnerDashboardDto> {
    return this.partnersService.getDashboard(userId);
  }

  /**
   * Get referral tree structure.
   */
  @Get('referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral tree structure' })
  @ApiQuery({ name: 'depth', required: false, type: Number, description: 'Tree depth (1-5)' })
  @ApiOkResponse({ type: ReferralTreeDto })
  async getReferralTree(
    @CurrentUser('id') userId: string,
    @Query('depth') depth?: string,
  ): Promise<ReferralTreeDto> {
    const maxDepth = Math.min(Math.max(parseInt(depth || '1', 10) || 1, 1), 5);
    return this.partnersService.getReferralTree(userId, maxDepth);
  }

  /**
   * Get commission history.
   */
  @Get('commissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get commission history with pagination' })
  @ApiOkResponse({
    description: 'Paginated list of commissions',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/CommissionDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getCommissions(
    @CurrentUser('id') userId: string,
    @Query() query: CommissionQueryDto,
  ): Promise<{ items: CommissionDto[]; total: number; page: number; limit: number }> {
    return this.partnersService.getCommissions(userId, query);
  }

  /**
   * Get available balance for withdrawal.
   */
  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available balance for withdrawal' })
  @ApiOkResponse({ type: AvailableBalanceDto })
  async getAvailableBalance(@CurrentUser('id') userId: string): Promise<AvailableBalanceDto> {
    return this.partnersService.getAvailableBalance(userId);
  }

  /**
   * Create withdrawal request.
   */
  @Post('withdrawals')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create withdrawal request' })
  @ApiOkResponse({ type: WithdrawalDto })
  async createWithdrawal(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<WithdrawalDto> {
    return this.partnersService.createWithdrawal(userId, dto);
  }

  /**
   * Get withdrawal history.
   */
  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get withdrawal history with pagination' })
  @ApiOkResponse({
    description: 'Paginated list of withdrawals',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/WithdrawalDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getWithdrawals(
    @CurrentUser('id') userId: string,
    @Query() query: WithdrawalQueryDto,
  ): Promise<{ items: WithdrawalDto[]; total: number; page: number; limit: number }> {
    return this.partnersService.getWithdrawals(userId, query);
  }

  /**
   * Preview tax calculation for withdrawal.
   */
  @Get('tax-preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview tax calculation for a withdrawal amount' })
  @ApiQuery({ name: 'amount', required: true, type: Number, description: 'Withdrawal amount' })
  @ApiQuery({ name: 'taxStatus', required: true, enum: TaxStatus, description: 'Tax status' })
  @ApiOkResponse({ type: TaxCalculationDto })
  async getTaxPreview(
    @Query('amount') amount: string,
    @Query('taxStatus') taxStatus: TaxStatus,
  ): Promise<TaxCalculationDto> {
    const amountNum = parseFloat(amount) || 0;
    return this.partnersService.calculateTax(amountNum, taxStatus);
  }

  /**
   * Get partner levels configuration (public).
   */
  @Get('levels')
  @ApiOperation({ summary: 'Get partner levels configuration (public)' })
  @ApiOkResponse({ type: [PartnerLevelDto] })
  getPartnerLevels(): PartnerLevelDto[] {
    return this.partnersService.getPartnerLevels();
  }
}
