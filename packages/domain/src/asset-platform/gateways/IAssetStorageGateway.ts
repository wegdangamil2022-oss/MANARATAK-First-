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

export interface AssetLifecycleReconciliationProof {
  operationId:string;kind:'ARCHIVE'|'RESTORE';status:'ARCHIVED'|'RESTORED';fenced:true;fenceToken:string;observedAt:string;
}
export interface IAssetStorageGateway {
  verifyRenditionRelation?(source: AssetStorageLocator, rendition: AssetStorageLocator, expected: {sourceSha256:string;checksumSha256:string}): Promise<{sourceSha256:string;checksumSha256:string;byteSize:number;mimeType:string;width:number;height:number;verifiedAt:string}>;
  generateUploadLocator(zone?: AssetStorageZone, assetId?: string): Promise<AssetStorageLocator>;
  generateUploadGrant?(zone: AssetStorageZone, request: AssetUploadGrantRequest): Promise<AssetUploadGrant>;
  generateDeliveryGrant?(locator: AssetStorageLocator, expiresInSeconds: number): Promise<AssetDeliveryGrant>;
  verifyUploadedObject?(locator: AssetStorageLocator, request: AssetUploadVerificationRequest): Promise<VerifiedAssetUpload>;
  /** With expectedSha256, promotion MUST durably replay the same source+digest result on retry, even after source removal. */
  moveToCleanZone(quarantineLocator: AssetStorageLocator, expectedSha256?: string): Promise<AssetStorageLocator>;
  openRead?(locator: AssetStorageLocator, maxBytes: number): AsyncIterable<Uint8Array>;
  read?(locator: AssetStorageLocator, maxBytes: number): Promise<Uint8Array>;
  reconcileLifecycleOperation?(locator:AssetStorageLocator,request:{operationId:string;kind:'ARCHIVE'|'RESTORE';expectedSha256?:string}):Promise<AssetLifecycleReconciliationProof|null>;
  archive(locator: AssetStorageLocator, operationId?: string): Promise<void>;
  restore(locator: AssetStorageLocator, operationId?: string): Promise<void>;
  /** Re-observe actual CLEAN bytes after restoration, before making an asset ACTIVE. */
  verifyRestoredObject?(locator: AssetStorageLocator, request: {
    expectedSha256: string;
    expectedByteSize: number;
    declaredMimeType: string;
  }): Promise<void>;
  delete(locator: AssetStorageLocator): Promise<void>;
}
