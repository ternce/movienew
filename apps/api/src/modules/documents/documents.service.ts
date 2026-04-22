import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { LegalDocumentType } from '@movie-platform/shared';

import { PrismaService } from '../../config/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active documents (metadata only, no content).
   */
  async findAll() {
    return this.prisma.legalDocument.findMany({
      where: { isActive: true },
      select: {
        id: true,
        type: true,
        title: true,
        version: true,
        isActive: true,
        requiresAcceptance: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active document by type (with full content).
   */
  async findByType(type: LegalDocumentType) {
    const document = await this.prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!document) {
      throw new NotFoundException(`Документ типа ${type} не найден`);
    }

    return document;
  }

  /**
   * Get document by ID.
   */
  async findById(id: string) {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    return document;
  }

  /**
   * Create a new document.
   */
  async create(dto: CreateDocumentDto) {
    return this.prisma.legalDocument.create({
      data: {
        type: dto.type,
        title: dto.title,
        version: dto.version,
        content: dto.content,
        requiresAcceptance: dto.requiresAcceptance ?? true,
        isActive: false,
      },
    });
  }

  /**
   * Update a document.
   */
  async update(id: string, dto: UpdateDocumentDto) {
    const document = await this.findById(id);

    if (document.isActive) {
      throw new ConflictException('Нельзя редактировать активный документ. Создайте новую версию.');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.version !== undefined) updateData.version = dto.version;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.requiresAcceptance !== undefined) updateData.requiresAcceptance = dto.requiresAcceptance;

    return this.prisma.legalDocument.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Publish a document (activate it and deactivate previous versions of same type).
   */
  async publish(id: string) {
    const document = await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      // Deactivate all previous active documents of the same type
      await tx.legalDocument.updateMany({
        where: {
          type: document.type,
          isActive: true,
          id: { not: id },
        },
        data: { isActive: false },
      });

      // Activate this document
      return tx.legalDocument.update({
        where: { id },
        data: {
          isActive: true,
          publishedAt: new Date(),
        },
      });
    });
  }

  /**
   * Deactivate a document.
   */
  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.legalDocument.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get pending documents that the user has not yet accepted.
   */
  async getPendingDocuments(userId: string) {
    const activeDocuments = await this.prisma.legalDocument.findMany({
      where: {
        isActive: true,
        requiresAcceptance: true,
      },
      select: {
        id: true,
        type: true,
        title: true,
        version: true,
        requiresAcceptance: true,
        publishedAt: true,
      },
    });

    if (activeDocuments.length === 0) return [];

    const acceptedDocumentIds = await this.prisma.documentAcceptance.findMany({
      where: {
        userId,
        documentId: { in: activeDocuments.map((d) => d.id) },
      },
      select: { documentId: true },
    });

    const acceptedSet = new Set(acceptedDocumentIds.map((a) => a.documentId));

    return activeDocuments.filter((doc) => !acceptedSet.has(doc.id));
  }

  /**
   * Accept a document.
   */
  async acceptDocument(
    userId: string,
    documentId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const document = await this.findById(documentId);

    if (!document.isActive) {
      throw new ConflictException('Нельзя принять неактивный документ');
    }

    // Check if already accepted
    const existing = await this.prisma.documentAcceptance.findUnique({
      where: {
        userId_documentId: { userId, documentId },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.documentAcceptance.create({
      data: {
        userId,
        documentId,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Get acceptance history for a document (paginated).
   */
  async getAcceptanceHistory(documentId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.documentAcceptance.findMany({
        where: { documentId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { acceptedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.documentAcceptance.count({ where: { documentId } }),
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
   * Get all versions of a document by type.
   */
  async getDocumentVersions(type: LegalDocumentType) {
    return this.prisma.legalDocument.findMany({
      where: { type },
      select: {
        id: true,
        type: true,
        title: true,
        version: true,
        isActive: true,
        requiresAcceptance: true,
        publishedAt: true,
        createdAt: true,
        _count: { select: { acceptances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
