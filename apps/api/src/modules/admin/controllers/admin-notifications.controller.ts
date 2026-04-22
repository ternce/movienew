import {
  Body,
  Controller,
  Delete,
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
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminNotificationsService } from '../services/admin-notifications.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NewsletterService } from '../../notifications/newsletter.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateNotificationDto,
  CreateCampaignDto,
  UpdateCampaignDto,
} from '../../notifications/dto';

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
    private readonly notificationsService: NotificationsService,
    private readonly newsletterService: NewsletterService,
  ) {}

  // ==================== TEMPLATES ====================

  /**
   * Get notification templates.
   */
  @Get('templates')
  @ApiOperation({ summary: 'Get notification templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTemplates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminNotificationsService.getTemplates(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
    );
  }

  /**
   * Get a single template.
   */
  @Get('templates/:id')
  @ApiOperation({ summary: 'Get notification template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplate(@Param('id') id: string) {
    return this.adminNotificationsService.getTemplate(id);
  }

  /**
   * Create a notification template.
   */
  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.adminNotificationsService.createTemplate(dto);
  }

  /**
   * Update a notification template.
   */
  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.adminNotificationsService.updateTemplate(id, dto);
  }

  /**
   * Delete a notification template.
   */
  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async deleteTemplate(@Param('id') id: string) {
    return this.adminNotificationsService.deleteTemplate(id);
  }

  // ==================== SEND NOTIFICATION ====================

  /**
   * Send a notification to a user.
   */
  @Post('send')
  @ApiOperation({ summary: 'Send notification to a user' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }

  // ==================== NEWSLETTERS ====================

  /**
   * Get newsletter campaigns.
   */
  @Get('newsletters')
  @ApiOperation({ summary: 'Get newsletter campaigns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getNewsletters(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.newsletterService.getCampaigns(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
      status as any,
    );
  }

  /**
   * Create a newsletter campaign.
   */
  @Post('newsletters')
  @ApiOperation({ summary: 'Create newsletter campaign' })
  async createNewsletter(@Body() dto: CreateCampaignDto) {
    return this.newsletterService.createCampaign(dto);
  }

  /**
   * Update a newsletter campaign.
   */
  @Patch('newsletters/:id')
  @ApiOperation({ summary: 'Update newsletter campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async updateNewsletter(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.newsletterService.updateCampaign(id, dto);
  }

  /**
   * Send a newsletter campaign.
   */
  @Post('newsletters/:id/send')
  @ApiOperation({ summary: 'Send newsletter campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async sendNewsletter(@Param('id') id: string) {
    return this.newsletterService.sendCampaign(id);
  }

  /**
   * Schedule a newsletter campaign.
   */
  @Post('newsletters/:id/schedule')
  @ApiOperation({ summary: 'Schedule newsletter campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async scheduleNewsletter(
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.newsletterService.scheduleCampaign(id, new Date(scheduledAt));
  }

  /**
   * Cancel a newsletter campaign.
   */
  @Post('newsletters/:id/cancel')
  @ApiOperation({ summary: 'Cancel newsletter campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async cancelNewsletter(@Param('id') id: string) {
    return this.newsletterService.cancelCampaign(id);
  }
}
