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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminPartnersService } from '../services/admin-partners.service';
import {
  AdminPartnersQueryDto,
  AdminCommissionsQueryDto,
  AdminWithdrawalsQueryDto,
} from '../dto/partner/admin-partner-query.dto';
import {
  AdminPartnerListDto,
  AdminPartnerStatsDto,
  AdminPartnerDetailDto,
} from '../dto/partner/admin-partner.dto';
import {
  AdminCommissionListDto,
  RejectCommissionDto,
  BatchApproveCommissionsDto,
  CommissionActionResponseDto,
  BatchCommissionActionResponseDto,
} from '../dto/partner/admin-commission.dto';
import {
  AdminWithdrawalDto,
  AdminWithdrawalListDto,
  RejectWithdrawalDto,
  WithdrawalActionResponseDto,
  AdminWithdrawalStatsDto,
} from '../dto/partner/admin-withdrawal.dto';

@ApiTags('Admin - Partners')
@ApiBearerAuth()
@Controller('admin/partners')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminPartnersController {
  constructor(private readonly partnersService: AdminPartnersService) {}

  // ============ Partner Endpoints ============

  /**
   * Get partner program statistics.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get partner program statistics' })
  @ApiResponse({ status: 200, type: AdminPartnerStatsDto })
  async getStats(): Promise<AdminPartnerStatsDto> {
    return this.partnersService.getPartnersStats();
  }

  // ============ Commission Endpoints ============
  // NOTE: Static routes (commissions, withdrawals) MUST come before
  // the parameterized :userId route, otherwise NestJS treats
  // "commissions" / "withdrawals" as a userId value.

  /**
   * Get all commissions with pagination and filters.
   */
  @Get('commissions')
  @ApiOperation({ summary: 'Get all commissions' })
  @ApiResponse({ status: 200, type: AdminCommissionListDto })
  async getCommissions(
    @Query() query: AdminCommissionsQueryDto,
  ): Promise<AdminCommissionListDto> {
    return this.partnersService.getCommissionsList(query);
  }

  /**
   * Approve a commission.
   */
  @Post('commissions/:id/approve')
  @ApiOperation({ summary: 'Approve a commission' })
  @ApiParam({ name: 'id', description: 'Commission ID' })
  @ApiResponse({ status: 200, type: CommissionActionResponseDto })
  async approveCommission(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<CommissionActionResponseDto> {
    const commission = await this.partnersService.approveCommission(id, adminId);
    return {
      success: true,
      message: 'Commission approved successfully',
      commission,
    };
  }

  /**
   * Reject a commission.
   */
  @Post('commissions/:id/reject')
  @ApiOperation({ summary: 'Reject a commission' })
  @ApiParam({ name: 'id', description: 'Commission ID' })
  @ApiResponse({ status: 200, type: CommissionActionResponseDto })
  async rejectCommission(
    @Param('id') id: string,
    @Body() dto: RejectCommissionDto,
    @CurrentUser('id') adminId: string,
  ): Promise<CommissionActionResponseDto> {
    const commission = await this.partnersService.rejectCommission(id, dto.reason, adminId);
    return {
      success: true,
      message: 'Commission rejected successfully',
      commission,
    };
  }

  /**
   * Batch approve multiple commissions.
   */
  @Post('commissions/approve-batch')
  @ApiOperation({ summary: 'Batch approve commissions' })
  @ApiResponse({ status: 200, type: BatchCommissionActionResponseDto })
  async approveCommissionsBatch(
    @Body() dto: BatchApproveCommissionsDto,
    @CurrentUser('id') adminId: string,
  ): Promise<BatchCommissionActionResponseDto> {
    return this.partnersService.approveCommissionsBatch(dto.ids, adminId);
  }

  // ============ Withdrawal Endpoints ============

  /**
   * Get withdrawal statistics.
   */
  @Get('withdrawals/stats')
  @ApiOperation({ summary: 'Get withdrawal statistics' })
  @ApiResponse({ status: 200, type: AdminWithdrawalStatsDto })
  async getWithdrawalStats(): Promise<AdminWithdrawalStatsDto> {
    return this.partnersService.getWithdrawalStats();
  }

  /**
   * Get all withdrawals with pagination and filters.
   */
  @Get('withdrawals')
  @ApiOperation({ summary: 'Get all withdrawals' })
  @ApiResponse({ status: 200, type: AdminWithdrawalListDto })
  async getWithdrawals(
    @Query() query: AdminWithdrawalsQueryDto,
  ): Promise<AdminWithdrawalListDto> {
    return this.partnersService.getWithdrawalsList(query);
  }

  /**
   * Get withdrawal details by ID.
   */
  @Get('withdrawals/:id')
  @ApiOperation({ summary: 'Get withdrawal details' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ status: 200, type: AdminWithdrawalDto })
  async getWithdrawal(@Param('id') id: string): Promise<AdminWithdrawalDto> {
    return this.partnersService.getWithdrawalById(id);
  }

  /**
   * Approve a withdrawal request.
   */
  @Post('withdrawals/:id/approve')
  @ApiOperation({ summary: 'Approve a withdrawal' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ status: 200, type: WithdrawalActionResponseDto })
  async approveWithdrawal(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<WithdrawalActionResponseDto> {
    const withdrawal = await this.partnersService.approveWithdrawal(id, adminId);
    return {
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal,
    };
  }

  /**
   * Reject a withdrawal request.
   */
  @Post('withdrawals/:id/reject')
  @ApiOperation({ summary: 'Reject a withdrawal' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ status: 200, type: WithdrawalActionResponseDto })
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser('id') adminId: string,
  ): Promise<WithdrawalActionResponseDto> {
    const withdrawal = await this.partnersService.rejectWithdrawal(id, dto.reason, adminId);
    return {
      success: true,
      message: 'Withdrawal rejected successfully',
      withdrawal,
    };
  }

  /**
   * Complete a withdrawal (mark as paid).
   */
  @Post('withdrawals/:id/complete')
  @ApiOperation({ summary: 'Complete a withdrawal' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ status: 200, type: WithdrawalActionResponseDto })
  async completeWithdrawal(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<WithdrawalActionResponseDto> {
    const withdrawal = await this.partnersService.completeWithdrawal(id, adminId);
    return {
      success: true,
      message: 'Withdrawal completed successfully',
      withdrawal,
    };
  }

  // ============ Partner List & Detail ============
  // These parameterized routes MUST come last so that static routes
  // like /commissions, /withdrawals, /stats are matched first.

  /**
   * Get partners list with pagination and filters.
   */
  @Get()
  @ApiOperation({ summary: 'Get partners list' })
  @ApiResponse({ status: 200, type: AdminPartnerListDto })
  async getPartners(
    @Query() query: AdminPartnersQueryDto,
  ): Promise<AdminPartnerListDto> {
    return this.partnersService.getPartnersList(query);
  }

  /**
   * Get partner details by user ID.
   */
  @Get(':userId')
  @ApiOperation({ summary: 'Get partner details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, type: AdminPartnerDetailDto })
  async getPartner(@Param('userId') userId: string): Promise<AdminPartnerDetailDto> {
    return this.partnersService.getPartnerById(userId);
  }
}
