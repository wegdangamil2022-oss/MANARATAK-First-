import { RetentionCategory, SecurityClassification } from '@manaratak/domain';

export interface RegisterFileInput {
  fileId: string;
  fileReference: string;
  originalFilename: string;
  mimeType: string;
  fileExtension: string;
  byteSize: number;
  retentionCategory: RetentionCategory;
  expiresAt?: Date;
  ownerReference: string;
  classification: SecurityClassification;
  storageLocator: string;
}

export interface ActivateFileInput {
  fileId: string;
  checksumAlgorithm: string;
  checksumHash: string;
}

export interface ArchiveFileInput {
  fileId: string;
}

export interface SoftDeleteFileInput {
  fileId: string;
}

export interface RestoreFileInput {
  fileId: string;
}

export interface GenerateUploadLocatorInput {
  filename: string;
}
