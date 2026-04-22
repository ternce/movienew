import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { DashboardOverviewDto, DashboardStatsDto } from '../dto';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  /**
   * Get full dashboard overview.
   */
  @Get()
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiOkResponse({ type: DashboardOverviewDto })
  async getDashboard(): Promise<DashboardOverviewDto> {
    return this.dashboardService.getDashboardOverview();
  }

  /**
   * Get dashboard stats only.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  @ApiOkResponse({ type: DashboardStatsDto })
  async getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats();
  }
}
