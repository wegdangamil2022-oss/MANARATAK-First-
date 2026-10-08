import { AssetStorageLocator } from '../value-objects/AssetStorageLocator';
import { AssetStorageZone } from '../enums/AssetStorageZone';

export interface AssetUploadGrantRequest {
  assetId?: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
}

export interface AssetUploadGrant {
  locator: AssetStorageLocator;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Readonly<Record<string, string>>;
  expiresAt: Date;
}

export interface AssetDeliveryGrant {
  url: string;
  headers: Readonly<Record<string, string>>;
  expiresAt: Date;
}

export interface VerifiedAssetUpload {
  /** Authoritative observations of the uploaded object, not client metadata. */
  byteSize: number;
  verifiedMimeType: string;
  checksumSha256: string;
  verifiedAt: string;
  signatureVerified: boolean;
}

export interface AssetUploadVerificationRequest {
  expectedByteSize?: number;
  declaredMimeType: string;
}

export interface IAssetStorageGateway {
  generateUploadLocator(zone?: AssetStorageZone, assetId?: string): Promise<AssetStorageLocator>;
  generateUploadGrant?(zone: AssetStorageZone, request: AssetUploadGrantRequest): Promise<AssetUploadGrant>;
  generateDeliveryGrant?(locator: AssetStorageLocator, expiresInSeconds: number): Promise<AssetDeliveryGrant>;
  verifyUploadedObject?(locator: AssetStorageLocator, request: AssetUploadVerificationRequest): Promise<VerifiedAssetUpload>;
  moveToCleanZone(quarantineLocator: AssetStorageLocator): Promise<AssetStorageLocator>;
  read?(locator: AssetStorageLocator, maxBytes: number): Promise<Uint8Array>;
  archive(locator: AssetStorageLocator): Promise<void>;
  restore(locator: AssetStorageLocator): Promise<void>;
  delete(locator: AssetStorageLocator): Promise<void>;
}
