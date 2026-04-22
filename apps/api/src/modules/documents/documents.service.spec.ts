import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LegalDocumentType } from '@movie-platform/shared';

import { DocumentsService } from './documents.service';
import { PrismaService } from '../../config/prisma.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;

  const mockDocument = {
    id: 'doc-1',
    type: LegalDocumentType.USER_AGREEMENT,
    title: 'Пользовательское соглашение',
    version: '1.0',
    content: '<h1>Agreement</h1>',
    isActive: true,
    requiresAcceptance: true,
    publishedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockInactiveDocument = {
    ...mockDocument,
    id: 'doc-2',
    isActive: false,
    publishedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      legalDocument: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      documentAcceptance: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // findAll Tests
  // ============================================
  describe('findAll', () => {
    it('should return active documents with metadata only', async () => {
      const docs = [mockDocument];
      prisma.legalDocument.findMany.mockResolvedValue(docs);

      const result = await service.findAll();

      expect(result).toEqual(docs);
      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith({
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
    });

    it('should return empty array when no active documents', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // findByType Tests
  // ============================================
  describe('findByType', () => {
    it('should return active document by type', async () => {
      prisma.legalDocument.findFirst.mockResolvedValue(mockDocument);

      const result = await service.findByType(LegalDocumentType.USER_AGREEMENT);

      expect(result).toEqual(mockDocument);
      expect(prisma.legalDocument.findFirst).toHaveBeenCalledWith({
        where: { type: LegalDocumentType.USER_AGREEMENT, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.legalDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.findByType(LegalDocumentType.PRIVACY_POLICY),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByType(LegalDocumentType.PRIVACY_POLICY),
      ).rejects.toThrow(`Document of type ${LegalDocumentType.PRIVACY_POLICY} not found`);
    });

    it('should order by createdAt desc to get latest', async () => {
      prisma.legalDocument.findFirst.mockResolvedValue(mockDocument);

      await service.findByType(LegalDocumentType.USER_AGREEMENT);

      expect(prisma.legalDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ============================================
  // findById Tests
  // ============================================
  describe('findById', () => {
    it('should return document by ID', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockDocument);

      const result = await service.findById('doc-1');

      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Document not found',
      );
    });
  });

  // ============================================
  // create Tests
  // ============================================
  describe('create', () => {
    const createDto = {
      type: LegalDocumentType.USER_AGREEMENT,
      title: 'Test Agreement',
      version: '1.0',
      content: '<p>Content</p>',
    };

    it('should create document with isActive=false', async () => {
      prisma.legalDocument.create.mockResolvedValue({
        ...createDto,
        id: 'new-doc',
        isActive: false,
        requiresAcceptance: true,
      });

      const result = await service.create(createDto);

      expect(result.isActive).toBe(false);
      expect(prisma.legalDocument.create).toHaveBeenCalledWith({
        data: {
          type: createDto.type,
          title: createDto.title,
          version: createDto.version,
          content: createDto.content,
          requiresAcceptance: true,
          isActive: false,
        },
      });
    });

    it('should default requiresAcceptance to true', async () => {
      prisma.legalDocument.create.mockResolvedValue({
        ...createDto,
        id: 'new-doc',
        isActive: false,
        requiresAcceptance: true,
      });

      await service.create(createDto);

      expect(prisma.legalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requiresAcceptance: true,
        }),
      });
    });

    it('should respect requiresAcceptance=false from DTO', async () => {
      const dtoWithFalse = { ...createDto, requiresAcceptance: false };
      prisma.legalDocument.create.mockResolvedValue({
        ...dtoWithFalse,
        id: 'new-doc',
        isActive: false,
      });

      await service.create(dtoWithFalse);

      expect(prisma.legalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requiresAcceptance: false,
        }),
      });
    });
  });

  // ============================================
  // update Tests
  // ============================================
  describe('update', () => {
    it('should update fields on inactive document', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockInactiveDocument);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockInactiveDocument,
        title: 'Updated Title',
      });

      const result = await service.update('doc-2', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(prisma.legalDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: { title: 'Updated Title' },
      });
    });

    it('should throw ConflictException on active document', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockDocument);

      await expect(
        service.update('doc-1', { title: 'Updated' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update('doc-1', { title: 'Updated' }),
      ).rejects.toThrow('Cannot edit an active document');
    });

    it('should only include defined fields in update', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockInactiveDocument);
      prisma.legalDocument.update.mockResolvedValue(mockInactiveDocument);

      await service.update('doc-2', { title: 'New Title' });

      expect(prisma.legalDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: { title: 'New Title' },
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // publish Tests
  // ============================================
  describe('publish', () => {
    it('should deactivate others of same type and activate current', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockInactiveDocument);
      prisma.legalDocument.updateMany.mockResolvedValue({ count: 1 });
      prisma.legalDocument.update.mockResolvedValue({
        ...mockInactiveDocument,
        isActive: true,
        publishedAt: new Date(),
      });

      const result = await service.publish('doc-2');

      expect(result.isActive).toBe(true);
      expect(prisma.legalDocument.updateMany).toHaveBeenCalledWith({
        where: {
          type: mockInactiveDocument.type,
          isActive: true,
          id: { not: 'doc-2' },
        },
        data: { isActive: false },
      });
    });

    it('should set publishedAt to current date', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockInactiveDocument);
      prisma.legalDocument.updateMany.mockResolvedValue({ count: 0 });
      prisma.legalDocument.update.mockResolvedValue({
        ...mockInactiveDocument,
        isActive: true,
        publishedAt: new Date(),
      });

      await service.publish('doc-2');

      expect(prisma.legalDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: {
          isActive: true,
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should only deactivate same type documents', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockInactiveDocument);
      prisma.legalDocument.updateMany.mockResolvedValue({ count: 0 });
      prisma.legalDocument.update.mockResolvedValue({
        ...mockInactiveDocument,
        isActive: true,
      });

      await service.publish('doc-2');

      expect(prisma.legalDocument.updateMany).toHaveBeenCalledWith({
        where: {
          type: mockInactiveDocument.type,
          isActive: true,
          id: { not: 'doc-2' },
        },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.publish('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // deactivate Tests
  // ============================================
  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockDocument);
      prisma.legalDocument.update.mockResolvedValue({
        ...mockDocument,
        isActive: false,
      });

      const result = await service.deactivate('doc-1');

      expect(result.isActive).toBe(false);
      expect(prisma.legalDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // getPendingDocuments Tests
  // ============================================
  describe('getPendingDocuments', () => {
    it('should return unaccepted documents', async () => {
      const activeDoc1 = { id: 'doc-1', type: 'USER_AGREEMENT', title: 'UA', version: '1.0', requiresAcceptance: true, publishedAt: new Date() };
      const activeDoc2 = { id: 'doc-2', type: 'PRIVACY_POLICY', title: 'PP', version: '1.0', requiresAcceptance: true, publishedAt: new Date() };

      prisma.legalDocument.findMany.mockResolvedValue([activeDoc1, activeDoc2]);
      prisma.documentAcceptance.findMany.mockResolvedValue([
        { documentId: 'doc-1' },
      ]);

      const result = await service.getPendingDocuments('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc-2');
    });

    it('should return empty array when no active documents', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      const result = await service.getPendingDocuments('user-123');

      expect(result).toEqual([]);
    });

    it('should return empty when all documents accepted', async () => {
      const activeDoc = { id: 'doc-1', type: 'USER_AGREEMENT', title: 'UA', version: '1.0', requiresAcceptance: true, publishedAt: new Date() };
      prisma.legalDocument.findMany.mockResolvedValue([activeDoc]);
      prisma.documentAcceptance.findMany.mockResolvedValue([
        { documentId: 'doc-1' },
      ]);

      const result = await service.getPendingDocuments('user-123');

      expect(result).toEqual([]);
    });

    it('should query only active documents that require acceptance', async () => {
      prisma.legalDocument.findMany.mockResolvedValue([]);

      await service.getPendingDocuments('user-123');

      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith({
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
    });
  });

  // ============================================
  // acceptDocument Tests
  // ============================================
  describe('acceptDocument', () => {
    it('should create acceptance record', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockDocument);
      prisma.documentAcceptance.findUnique.mockResolvedValue(null);
      const acceptance = {
        id: 'acceptance-1',
        userId: 'user-123',
        documentId: 'doc-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        acceptedAt: new Date(),
      };
      prisma.documentAcceptance.create.mockResolvedValue(acceptance);

      const result = await service.acceptDocument(
        'user-123',
        'doc-1',
        '127.0.0.1',
        'Test Agent',
      );

      expect(result).toEqual(acceptance);
      expect(prisma.documentAcceptance.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          documentId: 'doc-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        },
      });
    });

    it('should return existing acceptance if already accepted', async () => {
      const existing = {
        id: 'acceptance-1',
        userId: 'user-123',
        documentId: 'doc-1',
      };
      prisma.legalDocument.findUnique.mockResolvedValue(mockDocument);
      prisma.documentAcceptance.findUnique.mockResolvedValue(existing);

      const result = await service.acceptDocument(
        'user-123',
        'doc-1',
        '127.0.0.1',
        'Test Agent',
      );

      expect(result).toEqual(existing);
      expect(prisma.documentAcceptance.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for inactive document', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(mockInactiveDocument);

      await expect(
        service.acceptDocument('user-123', 'doc-2', '127.0.0.1', 'Agent'),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.acceptDocument('user-123', 'doc-2', '127.0.0.1', 'Agent'),
      ).rejects.toThrow('Cannot accept an inactive document');
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptDocument('user-123', 'non-existent', '127.0.0.1', 'Agent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getAcceptanceHistory Tests
  // ============================================
  describe('getAcceptanceHistory', () => {
    it('should return paginated acceptance history', async () => {
      const acceptances = [
        {
          id: 'a-1',
          userId: 'user-1',
          documentId: 'doc-1',
          acceptedAt: new Date(),
          user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
        },
      ];
      prisma.documentAcceptance.findMany.mockResolvedValue(acceptances);
      prisma.documentAcceptance.count.mockResolvedValue(1);

      const result = await service.getAcceptanceHistory('doc-1', 1, 10);

      expect(result.items).toEqual(acceptances);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      prisma.documentAcceptance.findMany.mockResolvedValue([]);
      prisma.documentAcceptance.count.mockResolvedValue(25);

      const result = await service.getAcceptanceHistory('doc-1', 1, 10);

      expect(result.totalPages).toBe(3);
    });
  });

  // ============================================
  // getDocumentVersions Tests
  // ============================================
  describe('getDocumentVersions', () => {
    it('should return all versions with acceptance count', async () => {
      const versions = [
        {
          id: 'doc-1',
          type: LegalDocumentType.USER_AGREEMENT,
          title: 'UA',
          version: '2.0',
          isActive: true,
          requiresAcceptance: true,
          publishedAt: new Date(),
          createdAt: new Date(),
          _count: { acceptances: 50 },
        },
        {
          id: 'doc-0',
          type: LegalDocumentType.USER_AGREEMENT,
          title: 'UA',
          version: '1.0',
          isActive: false,
          requiresAcceptance: true,
          publishedAt: new Date(),
          createdAt: new Date('2023-01-01'),
          _count: { acceptances: 200 },
        },
      ];
      prisma.legalDocument.findMany.mockResolvedValue(versions);

      const result = await service.getDocumentVersions(
        LegalDocumentType.USER_AGREEMENT,
      );

      expect(result).toHaveLength(2);
      expect(result[0]._count.acceptances).toBe(50);
      expect(prisma.legalDocument.findMany).toHaveBeenCalledWith({
        where: { type: LegalDocumentType.USER_AGREEMENT },
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
    });
  });
});
