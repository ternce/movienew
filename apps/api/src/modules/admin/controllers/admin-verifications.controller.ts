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
import { VerificationStatus, VerificationMethod } from '@prisma/client';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminVerificationsService } from '../services/admin-verifications.service';
import {
  AdminVerificationDto,
  AdminVerificationListDto,
  AdminVerificationStatsDto,
  RejectVerificationDto,
  VerificationActionResponseDto,
} from '../dto/verification';

@ApiTags('Admin - Verifications')
@ApiBearerAuth()
@Controller('admin/verifications')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminVerificationsController {
  constructor(private readonly verificationsService: AdminVerificationsService) {}

  /**
   * Get verifications list with filters and pagination.
   */
  @Get()
  @ApiOperation({ summary: 'Get verifications list' })
  @ApiResponse({ status: 200, type: AdminVerificationListDto })
  async getVerifications(
    @Query('status') status?: VerificationStatus,
    @Query('method') method?: VerificationMethod,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AdminVerificationListDto> {
    return this.verificationsService.getVerifications({
      status,
      method,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get verification queue statistics.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get verification queue statistics' })
  @ApiResponse({ status: 200, type: AdminVerificationStatsDto })
  async getStats(): Promise<AdminVerificationStatsDto> {
    return this.verificationsService.getStats();
  }

  /**
   * Get verification by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get verification by ID' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiResponse({ status: 200, type: AdminVerificationDto })
  async getVerification(@Param('id') id: string): Promise<AdminVerificationDto> {
    return this.verificationsService.getVerificationById(id);
  }

  /**
   * Approve a verification.
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve verification' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiResponse({ status: 200, type: VerificationActionResponseDto })
  async approveVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<VerificationActionResponseDto> {
    const verification = await this.verificationsService.approveVerification(id, adminId);
    return {
      success: true,
      message: 'Verification approved successfully',
      verification,
    };
  }

  /**
   * Reject a verification.
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject verification' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiResponse({ status: 200, type: VerificationActionResponseDto })
  async rejectVerification(
    @Param('id') id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser('id') adminId: string,
  ): Promise<VerificationActionResponseDto> {
    const verification = await this.verificationsService.rejectVerification(
      id,
      dto.reason,
      adminId,
    );
    return {
      success: true,
      message: 'Verification rejected successfully',
      verification,
    };
  }
}
