import {
  Controller,
  Get,
  Param,
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
import { AdminAuditService } from '../services/admin-audit.service';

@ApiTags('Admin - Audit')
@ApiBearerAuth()
@Controller('admin/audit')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  /**
   * Get audit logs with optional filters.
   */
  @Get()
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getAuditLogs(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
      { action, entityType, userId, dateFrom, dateTo },
    );
  }

  /**
   * Get a single audit log by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log detail' })
  @ApiParam({ name: 'id', description: 'Audit Log ID' })
  async getAuditLog(@Param('id') id: string) {
    return this.auditService.getAuditLog(id);
  }
}
