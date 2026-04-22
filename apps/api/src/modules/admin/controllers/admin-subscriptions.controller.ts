import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionStatus, SubscriptionPlanType } from '@prisma/client';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';
import {
  AdminSubscriptionDto,
  AdminSubscriptionListDto,
  AdminSubscriptionStatsDto,
  AdminExpiringSubscriptionDto,
  ExtendSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionActionResponseDto,
} from '../dto/subscription';

@ApiTags('Admin - Subscriptions')
@ApiBearerAuth()
@Controller('admin/subscriptions')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: AdminSubscriptionsService) {}

  /**
   * Get subscriptions list with filters and pagination.
   */
  @Get()
  @ApiOperation({ summary: 'Get subscriptions list' })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'planType', required: false, enum: SubscriptionPlanType })
  @ApiQuery({ name: 'search', required: false, description: 'Search by user email or name' })
  @ApiQuery({ name: 'autoRenew', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: AdminSubscriptionListDto })
  async getSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('planType') planType?: SubscriptionPlanType,
    @Query('search') search?: string,
    @Query('autoRenew') autoRenew?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AdminSubscriptionListDto> {
    return this.subscriptionsService.getSubscriptions({
      status,
      planType,
      search,
      autoRenew: autoRenew ? autoRenew === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get subscription statistics.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get subscription statistics' })
  @ApiResponse({ status: 200, type: AdminSubscriptionStatsDto })
  async getStats(): Promise<AdminSubscriptionStatsDto> {
    return this.subscriptionsService.getStats();
  }

  /**
   * Get subscriptions expiring soon.
   */
  @Get('expiring')
  @ApiOperation({ summary: 'Get subscriptions expiring soon' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days until expiration (default: 7)' })
  @ApiResponse({ status: 200, type: [AdminExpiringSubscriptionDto] })
  async getExpiringSubscriptions(
    @Query('days') days?: string,
  ): Promise<AdminExpiringSubscriptionDto[]> {
    return this.subscriptionsService.getExpiringSubscriptions(
      days ? parseInt(days, 10) : 7
    );
  }

  /**
   * Get subscription by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, type: AdminSubscriptionDto })
  async getSubscription(@Param('id') id: string): Promise<AdminSubscriptionDto> {
    return this.subscriptionsService.getSubscriptionById(id);
  }

  /**
   * Extend a subscription.
   */
  @Patch(':id/extend')
  @Roles(UserRole.ADMIN) // Only admins can extend
  @ApiOperation({ summary: 'Extend subscription by specified days' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, type: SubscriptionActionResponseDto })
  async extendSubscription(
    @Param('id') id: string,
    @Body() dto: ExtendSubscriptionDto,
    @CurrentUser('id') adminId: string,
  ): Promise<SubscriptionActionResponseDto> {
    const subscription = await this.subscriptionsService.extendSubscription(
      id,
      dto.days,
      dto.reason,
      adminId,
    );
    return {
      success: true,
      message: `Subscription extended by ${dto.days} days`,
      subscription,
    };
  }

  /**
   * Force cancel a subscription.
   */
  @Post(':id/cancel')
  @Roles(UserRole.ADMIN) // Only admins can force cancel
  @ApiOperation({ summary: 'Force cancel subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, type: SubscriptionActionResponseDto })
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser('id') adminId: string,
  ): Promise<SubscriptionActionResponseDto> {
    const subscription = await this.subscriptionsService.cancelSubscription(
      id,
      dto.reason,
      adminId,
    );
    return {
      success: true,
      message: 'Subscription cancelled successfully',
      subscription,
    };
  }
}
