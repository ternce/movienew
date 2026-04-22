import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CacheControl, CACHE_PRESETS } from '../../common/interceptors/cache-control.interceptor';
import { SubscriptionPlansService } from './subscription-plans.service';
import { UserSubscriptionsService } from './user-subscriptions.service';
import {
  CancelSubscriptionDto,
  PurchaseSubscriptionDto,
  SubscriptionAccessDto,
  SubscriptionPlanDto,
  SubscriptionPlanQueryDto,
  ToggleAutoRenewDto,
  UserSubscriptionDto,
  UserSubscriptionQueryDto,
} from './dto';
import { PaymentResultDto } from '../payments/dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly plansService: SubscriptionPlansService,
    private readonly subscriptionsService: UserSubscriptionsService,
  ) {}

  // ============ Plans (Public) ============

  /**
   * Get all available subscription plans.
   */
  @Public()
  @Get('plans')
  @CacheControl(CACHE_PRESETS.CDN_MEDIUM)
  @ApiOperation({ summary: 'Get available subscription plans (public)' })
  @ApiOkResponse({ type: [SubscriptionPlanDto] })
  async getPlans(@Query() query: SubscriptionPlanQueryDto): Promise<SubscriptionPlanDto[]> {
    return this.plansService.getActivePlans(query);
  }

  /**
   * Get a single plan by ID.
   */
  @Public()
  @Get('plans/:planId')
  @ApiOperation({ summary: 'Get subscription plan by ID (public)' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiOkResponse({ type: SubscriptionPlanDto })
  async getPlan(@Param('planId') planId: string): Promise<SubscriptionPlanDto> {
    return this.plansService.getPlanById(planId);
  }

  // ============ User Subscriptions ============

  /**
   * Purchase a subscription.
   */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a subscription' })
  @ApiOkResponse({ type: PaymentResultDto })
  async purchase(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseSubscriptionDto,
  ): Promise<PaymentResultDto> {
    return this.subscriptionsService.purchase(userId, dto);
  }

  /**
   * Get user's subscriptions.
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscriptions' })
  @ApiOkResponse({
    description: 'Paginated list of user subscriptions',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/UserSubscriptionDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getMySubscriptions(
    @CurrentUser('id') userId: string,
    @Query() query: UserSubscriptionQueryDto,
  ): Promise<{ items: UserSubscriptionDto[]; total: number; page: number; limit: number }> {
    return this.subscriptionsService.getUserSubscriptions(userId, query);
  }

  /**
   * Get active subscription.
   */
  @Get('my/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active subscription' })
  @ApiOkResponse({ type: UserSubscriptionDto })
  async getActiveSubscription(
    @CurrentUser('id') userId: string,
    @Query('planId') planId?: string,
  ): Promise<UserSubscriptionDto | null> {
    return this.subscriptionsService.getActiveSubscription(userId, planId);
  }

  /**
   * Check access to content.
   */
  @Get('access/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check access to content' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiOkResponse({ type: SubscriptionAccessDto })
  async checkAccess(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
  ): Promise<SubscriptionAccessDto> {
    return this.subscriptionsService.checkAccess(userId, contentId);
  }

  /**
   * Cancel a subscription.
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiOkResponse({ type: UserSubscriptionDto })
  async cancelSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<UserSubscriptionDto> {
    return this.subscriptionsService.cancelSubscription(userId, dto);
  }

  /**
   * Toggle auto-renewal.
   */
  @Put('auto-renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle auto-renewal' })
  @ApiOkResponse({ type: UserSubscriptionDto })
  async toggleAutoRenew(
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleAutoRenewDto,
  ): Promise<UserSubscriptionDto> {
    return this.subscriptionsService.toggleAutoRenew(userId, dto);
  }
}
