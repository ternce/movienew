import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@movie-platform/shared';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminBonusesService } from '../services/admin-bonuses.service';
import {
  AdminBonusStatsDto,
  AdjustBalanceDto,
  UserBonusDetailsDto,
  BonusCampaignDto,
  CampaignQueryDto,
  CreateBonusCampaignDto,
  UpdateBonusCampaignDto,
  CampaignExecutionResultDto,
  CreateBonusRateDto,
  UpdateBonusRateDto,
  BonusRateResponseDto,
  BonusReportQueryDto,
} from '../../bonuses/dto';

@ApiTags('admin/bonuses')
@ApiBearerAuth()
@Controller('admin/bonuses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminBonusesController {
  constructor(private readonly adminBonusesService: AdminBonusesService) {}

  // ==================== STATISTICS ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide bonus statistics' })
  @ApiResponse({ status: 200, type: AdminBonusStatsDto })
  async getStats(): Promise<AdminBonusStatsDto> {
    return this.adminBonusesService.getBonusStats();
  }

  // ==================== USER MANAGEMENT ====================

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user bonus details' })
  @ApiResponse({ status: 200, type: UserBonusDetailsDto })
  async getUserBonusDetails(@Param('userId') userId: string): Promise<UserBonusDetailsDto> {
    return this.adminBonusesService.getUserBonusDetails(userId);
  }

  @Post('users/:userId/adjust')
  @ApiOperation({ summary: 'Adjust user bonus balance' })
  @ApiResponse({ status: 200, description: 'Balance adjusted successfully' })
  async adjustUserBalance(
    @Param('userId') userId: string,
    @Body() dto: AdjustBalanceDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminBonusesService.adjustUserBalance(userId, dto, adminId);
  }

  // ==================== RATE MANAGEMENT ====================

  @Get('rates')
  @ApiOperation({ summary: 'Get all bonus rates' })
  @ApiResponse({ status: 200, type: [BonusRateResponseDto] })
  async getRates(): Promise<BonusRateResponseDto[]> {
    return this.adminBonusesService.getBonusRates();
  }

  @Post('rates')
  @ApiOperation({ summary: 'Create a new bonus rate' })
  @ApiResponse({ status: 201, type: BonusRateResponseDto })
  async createRate(
    @Body() dto: CreateBonusRateDto,
    @CurrentUser('id') adminId: string,
  ): Promise<BonusRateResponseDto> {
    return this.adminBonusesService.createBonusRate(dto, adminId);
  }

  @Patch('rates/:id')
  @ApiOperation({ summary: 'Update a bonus rate' })
  @ApiResponse({ status: 200, type: BonusRateResponseDto })
  async updateRate(
    @Param('id') id: string,
    @Body() dto: UpdateBonusRateDto,
    @CurrentUser('id') adminId: string,
  ): Promise<BonusRateResponseDto> {
    return this.adminBonusesService.updateBonusRate(id, dto, adminId);
  }

  @Delete('rates/:id')
  @ApiOperation({ summary: 'Deactivate a bonus rate' })
  @ApiResponse({ status: 200, description: 'Rate deactivated' })
  async deactivateRate(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<void> {
    return this.adminBonusesService.deactivateRate(id, adminId);
  }

  // ==================== CAMPAIGN MANAGEMENT ====================

  @Get('campaigns')
  @ApiOperation({ summary: 'Get bonus campaigns' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of campaigns',
  })
  async getCampaigns(
    @Query() query: CampaignQueryDto,
  ): Promise<{ items: BonusCampaignDto[]; total: number; page: number; limit: number }> {
    return this.adminBonusesService.getCampaigns(query);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get a single campaign' })
  @ApiResponse({ status: 200, type: BonusCampaignDto })
  async getCampaign(@Param('id') id: string): Promise<BonusCampaignDto> {
    return this.adminBonusesService.getCampaignById(id);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new bonus campaign' })
  @ApiResponse({ status: 201, type: BonusCampaignDto })
  async createCampaign(
    @Body() dto: CreateBonusCampaignDto,
    @CurrentUser('id') adminId: string,
  ): Promise<BonusCampaignDto> {
    return this.adminBonusesService.createCampaign(dto, adminId);
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiResponse({ status: 200, type: BonusCampaignDto })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateBonusCampaignDto,
    @CurrentUser('id') adminId: string,
  ): Promise<BonusCampaignDto> {
    return this.adminBonusesService.updateCampaign(id, dto, adminId);
  }

  @Post('campaigns/:id/execute')
  @ApiOperation({ summary: 'Execute a campaign and grant bonuses' })
  @ApiResponse({ status: 200, type: CampaignExecutionResultDto })
  async executeCampaign(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<CampaignExecutionResultDto> {
    return this.adminBonusesService.executeCampaign(id, adminId);
  }

  @Post('campaigns/:id/cancel')
  @ApiOperation({ summary: 'Cancel a campaign' })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  async cancelCampaign(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<void> {
    return this.adminBonusesService.cancelCampaign(id, adminId);
  }

  // ==================== REPORTS ====================

  @Get('export')
  @ApiOperation({ summary: 'Export bonus report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportReport(
    @Query() query: BonusReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.adminBonusesService.exportBonusReport(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bonus-report.csv');
    res.send(buffer);
  }
}
