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
  ApiTags,
} from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminUsersService, AdminUserDto, AdminUserQueryDto } from '../services/admin-users.service';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  /**
   * Get users with filters.
   */
  @Get()
  @ApiOperation({ summary: 'Get users list' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by email or name' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'verificationStatus', required: false, enum: VerificationStatus })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('verificationStatus') verificationStatus?: VerificationStatus,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: AdminUserDto[]; total: number; page: number; limit: number }> {
    const query: AdminUserQueryDto = {
      search,
      role,
      verificationStatus,
      isActive: isActive ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.usersService.getUsers(query);
  }

  /**
   * Get user by ID.
   */
  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUser(@Param('userId') userId: string): Promise<AdminUserDto> {
    return this.usersService.getUserById(userId);
  }

  /**
   * Update user role.
   */
  @Patch(':userId/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateRole(
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
    @CurrentUser('id') adminId: string,
  ): Promise<AdminUserDto> {
    return this.usersService.updateUserRole(userId, role, adminId);
  }

  /**
   * Deactivate user.
   */
  @Post(':userId/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async deactivateUser(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
  ): Promise<AdminUserDto> {
    return this.usersService.toggleActive(userId, false, adminId);
  }

  /**
   * Activate user.
   */
  @Post(':userId/activate')
  @ApiOperation({ summary: 'Activate user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async activateUser(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
  ): Promise<AdminUserDto> {
    return this.usersService.toggleActive(userId, true, adminId);
  }

  /**
   * Adjust user's bonus balance.
   */
  @Post(':userId/bonus-adjust')
  @ApiOperation({ summary: 'Adjust user bonus balance' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async adjustBonus(
    @Param('userId') userId: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ): Promise<AdminUserDto> {
    return this.usersService.adjustBonusBalance(userId, amount, reason, adminId);
  }
}
