import {
  AssetLifecycleState,
  AssetSecurityClassification,
  AssetRetentionCategory,
  AssetStorageZone
} from '@manaratak/domain';

export interface RequestAssetUploadLocatorDto {
  assetId: string;
  assetReference: string;
  ownerId: string;
  ownerType: string;
  originalFilename: string;
  mimeType: string;
  fileExtension: string;
  byteSize: number;
  classification: AssetSecurityClassification;
  retentionCategory?: AssetRetentionCategory;
  expiresAt?: string | Date;
}

export interface AssetUploadLocatorDto {
  assetId: string;
  assetReference: string;
  storageLocator: string;
  storageZone: AssetStorageZone;
  bucketName: string;
  pathKey: string;
  lifecycleState: AssetLifecycleState;
  uploadGrant?: {
    uploadUrl: string;
    method: 'PUT' | 'POST';
    headers: Readonly<Record<string, string>>;
    expiresAt: string;
  };
}

export interface RegisterQuarantinedAssetDto {
  assetId: string;
  assetReference: string;
  ownerId: string;
  ownerType: string;
  originalFilename: string;
  mimeType: string;
  fileExtension: string;
  byteSize: number;
  classification: AssetSecurityClassification;
  bucketName: string;
  pathKey: string;
  retentionCategory?: AssetRetentionCategory;
  expiresAt?: string | Date;
}

export interface ValidateAssetDto {
  assetId: string;
}

export interface MarkAssetMalwareScanFailedDto {
  assetId: string;
  reason: string;
}

export interface SanitizeAssetDto {
  assetId: string;
  exifStripped?: boolean;
  sanitizerNotes?: string;
}

export interface ActivateAssetDto {
  assetId: string;
}

export interface RequestAssetDeliveryGrantDto {
  assetId: string;
  expiresInSeconds?: number;
}

export interface AssetDeliveryGrantDto {
  assetId: string;
  url: string;
  headers: Readonly<Record<string, string>>;
  expiresAt: string;
}

export interface ArchiveAssetDto {
  assetId: string;
}

export interface SoftDeleteAssetDto {
  assetId: string;
}

export interface RestoreAssetDto {
  assetId: string;
}

export interface PurgeAssetDto {
  assetId: string;
}

export interface AssetRecordDto {
  id: string;
  reference: string;
  storageLocator: string;
  storageZone: AssetStorageZone;
  bucketName: string;
  pathKey: string;
  owner: {
    ownerId: string;
    ownerType: string;
  };
  metadata: {
    originalFilename: string;
    mimeType: string;
    fileExtension: string;
    byteSize: number;
    width?: number;
    height?: number;
    duration?: number;
  };
  retention: {
    category: AssetRetentionCategory;
    expiresAt?: string;
  };
  classification: AssetSecurityClassification;
  state: AssetLifecycleState;
  checksum?: {
    algorithm: string;
    hash: string;
  };
  sanitization?: {
    exifStripped: boolean;
    sanitizedAt?: string;
    sanitizerNotes?: string;
  };
}
