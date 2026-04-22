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
import { LegalDocumentType, UserRole } from '@movie-platform/shared';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminDocumentsService } from '../services/admin-documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from '../../documents/dto';

@ApiTags('Admin - Documents')
@ApiBearerAuth()
@Controller('admin/documents')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminDocumentsController {
  constructor(private readonly documentsService: AdminDocumentsService) {}

  /**
   * Get all documents (paginated).
   */
  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDocuments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.getDocuments(
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
    );
  }

  /**
   * Get a single document by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async getDocument(@Param('id') id: string) {
    return this.documentsService.getDocument(id);
  }

  /**
   * Create a new document.
   */
  @Post()
  @ApiOperation({ summary: 'Create document' })
  async createDocument(@Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(dto);
  }

  /**
   * Update a document.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, dto);
  }

  /**
   * Publish a document.
   */
  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async publishDocument(@Param('id') id: string) {
    return this.documentsService.publishDocument(id);
  }

  /**
   * Deactivate a document.
   */
  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async deactivateDocument(@Param('id') id: string) {
    return this.documentsService.deactivateDocument(id);
  }

  /**
   * Get acceptances for a document.
   */
  @Get(':id/acceptances')
  @ApiOperation({ summary: 'Get document acceptances' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAcceptances(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.getAcceptances(
      id,
      parseInt(page ?? '1') || 1,
      parseInt(limit ?? '20') || 20,
    );
  }

  /**
   * Get version history for a document type.
   */
  @Get('types/:type/versions')
  @ApiOperation({ summary: 'Get document version history by type' })
  @ApiParam({ name: 'type', description: 'Document type', enum: LegalDocumentType })
  async getVersions(@Param('type') type: LegalDocumentType) {
    return this.documentsService.getVersions(type);
  }
}
