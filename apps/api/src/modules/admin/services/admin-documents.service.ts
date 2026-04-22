import { Injectable } from '@nestjs/common';
import { LegalDocumentType } from '@movie-platform/shared';

import { DocumentsService } from '../../documents/documents.service';
import { PrismaService } from '../../../config/prisma.service';
import { CreateDocumentDto } from '../../documents/dto';
import { UpdateDocumentDto } from '../../documents/dto';

@Injectable()
export class AdminDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Get paginated documents (all, not just active).
   */
  async getDocuments(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.legalDocument.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.legalDocument.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single document by ID.
   */
  async getDocument(id: string) {
    return this.documentsService.findById(id);
  }

  /**
   * Create a new document.
   */
  async createDocument(dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }

  /**
   * Update a document.
   */
  async updateDocument(id: string, dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  /**
   * Publish a document.
   */
  async publishDocument(id: string) {
    return this.documentsService.publish(id);
  }

  /**
   * Deactivate a document.
   */
  async deactivateDocument(id: string) {
    return this.documentsService.deactivate(id);
  }

  /**
   * Get paginated acceptances for a document.
   */
  async getAcceptances(documentId: string, page: number, limit: number) {
    return this.documentsService.getAcceptanceHistory(documentId, page, limit);
  }

  /**
   * Get version history for a document type.
   */
  async getVersions(type: LegalDocumentType) {
    return this.documentsService.getDocumentVersions(type);
  }
}
