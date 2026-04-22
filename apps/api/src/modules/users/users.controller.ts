import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateProfileDto,
  VerificationSubmissionDto,
  UserProfileDto,
  VerificationStatusDto,
  UserSessionDto,
  ChangePasswordDto,
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
} from './dto';
import { AddToWatchlistDto } from './dto/watchlist.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserProfileDto,
  })
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfileDto> {
    return this.usersService.getProfile(userId);
  }

  /**
   * Update current user profile.
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Updated user profile',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(userId, dto);
  }

  /**
   * Upload user avatar.
   */
  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }
    const user = await this.usersService.uploadAvatar(userId, file);
    return { success: true, data: { avatarUrl: user.avatarUrl } };
  }

  /**
   * Change current user password.
   */
  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect or new password is invalid',
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }

  /**
   * Request email change — sends OTP code to new email.
   */
  @Post('me/email/request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email change OTP code' })
  @ApiResponse({
    status: 200,
    description: 'OTP code sent to new email',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or same as current',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use',
  })
  async requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestEmailChangeDto,
  ) {
    const result = await this.usersService.requestEmailChange(userId, dto.newEmail);
    return { success: true, message: result.message };
  }

  /**
   * Confirm email change with OTP code.
   */
  @Post('me/email/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email change with OTP code' })
  @ApiResponse({
    status: 200,
    description: 'Email updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired code',
  })
  async confirmEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    const user = await this.usersService.confirmEmailChange(userId, dto.code);
    return { success: true, data: user };
  }

  /**
   * Submit verification request.
   */
  @Post('me/verification')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit verification request' })
  @ApiResponse({
    status: 201,
    description: 'Verification request submitted',
    type: VerificationStatusDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification data',
  })
  @ApiResponse({
    status: 409,
    description: 'Verification already pending or approved',
  })
  async submitVerification(
    @CurrentUser('id') userId: string,
    @Body() dto: VerificationSubmissionDto,
  ): Promise<VerificationStatusDto> {
    return this.usersService.submitVerification(userId, dto);
  }

  /**
   * Get verification status.
   */
  @Get('me/verification/status')
  @ApiOperation({ summary: 'Get verification status' })
  @ApiResponse({
    status: 200,
    description: 'Verification status',
    type: VerificationStatusDto,
  })
  async getVerificationStatus(
    @CurrentUser('id') userId: string,
  ): Promise<VerificationStatusDto> {
    return this.usersService.getVerificationStatus(userId);
  }

  /**
   * Get active sessions.
   */
  @Get('me/sessions')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    type: [UserSessionDto],
  })
  async getActiveSessions(
    @CurrentUser('id') userId: string,
  ): Promise<UserSessionDto[]> {
    return this.usersService.getActiveSessions(userId);
  }

  /**
   * Get referral statistics.
   */
  @Get('me/referrals')
  @ApiOperation({ summary: 'Get referral statistics' })
  @ApiResponse({
    status: 200,
    description: 'Referral statistics',
  })
  async getReferralStats(@CurrentUser('id') userId: string) {
    return this.usersService.getReferralStats(userId);
  }

  /**
   * Get watchlist (saved content).
   */
  @Get('me/watchlist')
  @ApiOperation({ summary: 'Get user watchlist' })
  @ApiResponse({ status: 200, description: 'Paginated watchlist items' })
  async getWatchlist(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getWatchlist(
      userId,
      parseInt(page || '1') || 1,
      parseInt(limit || '20') || 20,
    );
  }

  /**
   * Add content to watchlist.
   */
  @Post('me/watchlist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add content to watchlist' })
  @ApiResponse({ status: 201, description: 'Added to watchlist' })
  async addToWatchlist(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToWatchlistDto,
  ) {
    return this.usersService.addToWatchlist(userId, dto.contentId);
  }

  /**
   * Remove content from watchlist.
   */
  @Delete('me/watchlist/:contentId')
  @ApiOperation({ summary: 'Remove content from watchlist' })
  @ApiResponse({ status: 200, description: 'Removed from watchlist' })
  async removeFromWatchlist(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.usersService.removeFromWatchlist(userId, contentId);
  }

  /**
   * Terminate a specific session.
   */
  @Delete('me/sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  async terminateSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.usersService.terminateSession(userId, sessionId);
  }

  /**
   * Terminate all other sessions.
   */
  @Delete('me/sessions')
  @ApiOperation({ summary: 'Terminate all other sessions' })
  @ApiResponse({ status: 200, description: 'Sessions terminated' })
  async terminateAllSessions(@CurrentUser('id') userId: string) {
    return this.usersService.terminateAllSessions(userId);
  }
}
