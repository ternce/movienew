import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LegalDocumentType } from '@movie-platform/shared';
import { Request } from 'express';

import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Map URL-friendly slugs to LegalDocumentType enum values.
 */
const SLUG_TO_TYPE: Record<string, LegalDocumentType> = {
  terms: LegalDocumentType.USER_AGREEMENT,
  privacy: LegalDocumentType.PRIVACY_POLICY,
  partner: LegalDocumentType.PARTNER_AGREEMENT,
  offer: LegalDocumentType.OFFER,
  rules: LegalDocumentType.SUPPLEMENTARY,
};

/**
 * Resolve a URL param to a LegalDocumentType.
 * Accepts both slugs ("terms") and raw enum values ("USER_AGREEMENT").
 */
function resolveDocumentType(param: string): LegalDocumentType {
  // Check slug map first
  const fromSlug = SLUG_TO_TYPE[param];
  if (fromSlug) return fromSlug;

  // Check raw enum value
  const enumValues = Object.values(LegalDocumentType) as string[];
  if (enumValues.includes(param)) return param as LegalDocumentType;

  throw new BadRequestException(`Unknown document type: ${param}`);
}

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * List all active documents (metadata only).
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active legal documents' })
  @ApiResponse({ status: 200, description: 'List of active documents' })
  async findAll() {
    return this.documentsService.findAll();
  }

  /**
   * Get pending documents for the current user.
   */
  @Get('pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending documents for current user' })
  @ApiResponse({ status: 200, description: 'List of pending documents' })
  async getPendingDocuments(@CurrentUser('id') userId: string) {
    return this.documentsService.getPendingDocuments(userId);
  }

  /**
   * Get document by type (with full content).
   * Accepts URL slugs (terms, privacy, partner, offer, rules)
   * or raw enum values (USER_AGREEMENT, PRIVACY_POLICY, etc.).
   */
  @Get(':type')
  @Public()
  @ApiOperation({ summary: 'Get active document by type' })
  @ApiResponse({ status: 200, description: 'Document with full content' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findByType(@Param('type') type: string) {
    const resolvedType = resolveDocumentType(type);
    return this.documentsService.findByType(resolvedType);
  }

  /**
   * Accept a document.
   */
  @Post(':type/accept')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a legal document' })
  @ApiResponse({ status: 201, description: 'Document accepted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async acceptDocument(
    @Param('type') type: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const resolvedType = resolveDocumentType(type);
    const document = await this.documentsService.findByType(resolvedType);
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.documentsService.acceptDocument(
      userId,
      document.id,
      ipAddress,
      userAgent,
    );
  }
}
