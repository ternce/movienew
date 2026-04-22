// Legal document types
export enum LegalDocumentType {
  USER_AGREEMENT = 'USER_AGREEMENT',
  OFFER = 'OFFER',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  PARTNER_AGREEMENT = 'PARTNER_AGREEMENT',
  SUPPLEMENTARY = 'SUPPLEMENTARY',
}

// Legal document
export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  title: string;
  version: string;
  content: string;
  isActive: boolean;
  requiresAcceptance: boolean;
  publishedAt?: Date;
  createdAt: Date;
}

// Document acceptance
export interface DocumentAcceptance {
  id: string;
  userId: string;
  documentId: string;
  ipAddress: string;
  userAgent: string;
  acceptedAt: Date;
}
