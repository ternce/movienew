import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get user's notifications (paginated, optionally filtered by type).
   */
  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      query.page ?? 1,
      query.limit ?? 20,
      query.type,
    );
  }

  /**
   * Get unread notification count.
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Get notification preferences.
   */
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  /**
   * Update notification preferences.
   */
  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Updated preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  /**
   * Mark a notification as read.
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  /**
   * Mark all notifications as read.
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Delete a single notification.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(userId, notificationId);
  }

  /**
   * Delete all notifications.
   */
  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications deleted' })
  async deleteAllNotifications(@CurrentUser('id') userId: string) {
    return this.notificationsService.deleteAllNotifications(userId);
  }
}
