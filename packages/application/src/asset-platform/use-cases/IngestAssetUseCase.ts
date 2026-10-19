import { createHash } from 'node:crypto';
import {
  IAssetRecordRepository,
  IAssetStorageGateway,
  AssetRecord,
  AssetId,
  AssetReference,
  AssetOwnerReference,
  AssetMetadata,
  AssetRetentionMetadata,
  AssetRetentionCategory,
  AssetStorageZone,
  AssetLifecycleState,
  AssetSecurityClassification,
} from '@manaratak/domain';

import {
  RequestAssetUploadLocatorDto,
  AssetUploadLocatorDto,
  RegisterQuarantinedAssetDto,
  AssetRecordDto,
} from '../dtos/AssetDtos';
import { AssetRecordMapper } from '../mappers/AssetRecordMapper';
import { AssetValidator } from '../utils/AssetValidator';

export class IngestAssetUseCase {
  constructor(
    private readonly assetRepository: IAssetRecordRepository,
    private readonly storageGateway: IAssetStorageGateway,
  ) {}

  public async requestUploadLocator(
    input: RequestAssetUploadLocatorDto,
  ): Promise<AssetUploadLocatorDto> {
    AssetValidator.validate(input);
    return this.allocateUpload(input);
  }

  /** Internal P15 entry records purpose/consent while retaining the normal quarantine pipeline. */
  public async requestStudentDocumentUpload(input:RequestAssetUploadLocatorDto):Promise<AssetUploadLocatorDto>{
    AssetValidator.validate(input);
    const expiry=input.expiresAt?new Date(input.expiresAt).getTime():NaN;
    if(input.ownerType!=='STUDENT'||input.classification!==AssetSecurityClassification.CONFIDENTIAL||input.retentionCategory!==AssetRetentionCategory.TEMPORARY||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+180*86400000||!input.assetReference.startsWith('STUDENT-DOCUMENT-'))throw new Error('STUDENT_DOCUMENT_UPLOAD_POLICY_INVALID');
    return this.allocateUpload(input,{purpose:'STUDENT_APPLICATION_PREPARATION',consentGrantedAt:new Date().toISOString(),retentionPolicy:'MAX_180_DAYS'});
  }

  private async allocateUpload(
    input: RequestAssetUploadLocatorDto,
    extraMetadata?: Record<string, unknown>,
  ): Promise<AssetUploadLocatorDto> {
    const id = new AssetId(input.assetId);
    const existing = await this.assetRepository.findById(id);
    if (existing) {
      throw new Error(`Asset with id ${input.assetId} already exists`);
    }

    const reference = new AssetReference(input.assetReference);
    const uploadGrant = this.storageGateway.generateUploadGrant
      ? await this.storageGateway.generateUploadGrant(
          AssetStorageZone.QUARANTINE,
          {
            assetId: id.value,
            originalFilename: input.originalFilename,
            mimeType: input.mimeType,
            byteSize: input.byteSize,
          },
        )
      : undefined;
    const quarantineLocator =
      uploadGrant?.locator ??
      (await this.storageGateway.generateUploadLocator(
        AssetStorageZone.QUARANTINE,
        id.value,
      ));

    const record = new AssetRecord(
      {
        id,
        reference,
        locator: quarantineLocator,
        metadata: new AssetMetadata(
          input.originalFilename,
          input.mimeType,
          input.fileExtension,
          input.byteSize,
          undefined,
          undefined,
          undefined,
          extraMetadata,
        ),
        retention: new AssetRetentionMetadata(
          input.retentionCategory ?? AssetRetentionCategory.PERMANENT,
          input.expiresAt ? new Date(input.expiresAt) : null,
        ),
        owner: new AssetOwnerReference(input.ownerId, input.ownerType),
        classification: input.classification,
        state: undefined as any,
      },
      true,
    );

    record.assignQuarantineLocator(quarantineLocator);
    await this.assetRepository.save(record);

    return {
      assetId: record.id.value,
      assetReference: record.reference.value,
      storageLocator: record.locator.value,
      storageZone: record.locator.storageZone,
      bucketName: record.locator.bucketName,
      pathKey: record.locator.pathKey,
      lifecycleState: record.state,
      uploadGrant: uploadGrant
        ? {
            uploadUrl: uploadGrant.uploadUrl,
            method: uploadGrant.method,
            headers: uploadGrant.headers,
            expiresAt: uploadGrant.expiresAt.toISOString(),
          }
        : undefined,
    };
  }

  /** Server-only P14 entry; no HTTP upload route accepts this generated-artifact contract. */
  public async requestGeneratedCertificateUpload(
    input: RequestAssetUploadLocatorDto & {
      bytes: Uint8Array;
      kind: 'PDF' | 'PREVIEW' | 'QR';
      renderFingerprint: string;
    },
  ): Promise<AssetUploadLocatorDto> {
    AssetValidator.validateGeneratedCertificate(input);
    const expected =
      input.kind === 'QR'
        ? AssetSecurityClassification.PUBLIC
        : AssetSecurityClassification.INTERNAL;
    if (
      input.classification !== expected ||
      input.retentionCategory !== AssetRetentionCategory.PERMANENT ||
      input.expiresAt !== undefined
    )
      throw new Error('CERTIFICATE_GENERATED_UPLOAD_POLICY_INVALID');
    return this.allocateUpload(input, {
      certificateGenerated: {
        source: 'Phase14',
        kind: input.kind,
        renderFingerprint: input.renderFingerprint,
        sourceSha256: createHash('sha256').update(input.bytes).digest('hex'),
        sourceByteSize: input.bytes.byteLength,
      },
      ...(input.kind === 'QR'
        ? {
            rights: {
              rightsSource:
                'Original MANARATAK-generated verification QR graphic',
              attribution: 'MANARATAK',
              usageScope: 'PUBLIC',
              publicationPolicy: 'MANDATORY',
            },
          }
        : {}),
    });
  }
  /** Retry only an unverified generated upload, without allocating another EAP identity. */
  public async resumeGeneratedUpload(
    input: RequestAssetUploadLocatorDto & {
      bytes: Uint8Array;
      kind: 'PDF' | 'PREVIEW' | 'QR';
      renderFingerprint: string;
    },
  ): Promise<AssetUploadLocatorDto> {
    AssetValidator.validateGeneratedCertificate(input);
    const record = await this.assetRepository.findById(
      new AssetId(input.assetId),
    );
    if (
      !record ||
      record.reference.value !== input.assetReference ||
      record.owner.ownerType !== 'Certificate' ||
      record.owner.ownerId !== input.ownerId ||
      input.ownerType !== 'Certificate' ||
      record.state !== AssetLifecycleState.INITIATED ||
      record.uploadVerification ||
      record.metadata.mimeType !== input.mimeType ||
      record.metadata.byteSize !== input.byteSize ||
      record.classification !== input.classification
    )
      throw new Error('CERTIFICATE_UPLOAD_RESUME_INVALID');
    const provenance = record.metadata.extraMetadata?.certificateGenerated as Record<string, unknown> | undefined;
    if (provenance?.source !== 'Phase14' || provenance.kind !== input.kind ||
        provenance.renderFingerprint !== input.renderFingerprint ||
        provenance.sourceByteSize !== input.bytes.byteLength ||
        provenance.sourceSha256 !== createHash('sha256').update(input.bytes).digest('hex'))
      throw new Error('CERTIFICATE_ARTIFACT_SOURCE_MISMATCH');
    if (!this.storageGateway.refreshUploadGrant)
      throw new Error('EAP_GENERATED_ARTIFACT_UPLOAD_REFRESH_REQUIRED');
    const grant = await this.storageGateway.refreshUploadGrant(record.locator, {
      assetId: record.id.value,
      originalFilename: record.metadata.originalFilename,
      mimeType: record.metadata.mimeType,
      byteSize: record.metadata.byteSize,
    });
    if (grant.locator.value !== record.locator.value)
      throw new Error('CERTIFICATE_UPLOAD_RESUME_LOCATOR_CHANGED');
    return {
      assetId: record.id.value,
      assetReference: record.reference.value,
      storageLocator: record.locator.value,
      storageZone: record.locator.storageZone,
      bucketName: record.locator.bucketName,
      pathKey: record.locator.pathKey,
      lifecycleState: record.state,
      uploadGrant: {
        uploadUrl: grant.uploadUrl,
        method: grant.method,
        headers: grant.headers,
        expiresAt: grant.expiresAt.toISOString(),
      },
    };
  }

  /** Legacy compatibility allocation; uploaded bytes still require finalizeUploadedAsset. */
  public async registerQuarantinedAsset(
    input: RegisterQuarantinedAssetDto,
  ): Promise<AssetRecordDto> {
    AssetValidator.validate(input);

    const id = new AssetId(input.assetId);
    const existing = await this.assetRepository.findById(id);
    if (existing) {
      throw new Error(`Asset with id ${input.assetId} already exists`);
    }

    const reference = new AssetReference(input.assetReference);
    const initialLocator = await this.storageGateway.generateUploadLocator(
      AssetStorageZone.QUARANTINE,
      id.value,
    );

    const record = new AssetRecord(
      {
        id,
        reference,
        locator: initialLocator,
        metadata: new AssetMetadata(
          input.originalFilename,
          input.mimeType,
          input.fileExtension,
          input.byteSize,
        ),
        retention: new AssetRetentionMetadata(
          input.retentionCategory ?? AssetRetentionCategory.PERMANENT,
          input.expiresAt ? new Date(input.expiresAt) : null,
        ),
        owner: new AssetOwnerReference(input.ownerId, input.ownerType),
        classification: input.classification,
        state: undefined as any,
      },
      true,
    );

    record.assignQuarantineLocator(initialLocator);
    await this.assetRepository.save(record);

    return AssetRecordMapper.toDto(record);
  }
}
