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
  AssetStorageZone
} from '@manaratak/domain';

import {
  RequestAssetUploadLocatorDto,
  AssetUploadLocatorDto,
  RegisterQuarantinedAssetDto,
  AssetRecordDto
} from '../dtos/AssetDtos';
import { AssetRecordMapper } from '../mappers/AssetRecordMapper';
import { AssetValidator } from '../utils/AssetValidator';

export class IngestAssetUseCase {
  constructor(
    private readonly assetRepository: IAssetRecordRepository,
    private readonly storageGateway: IAssetStorageGateway
  ) {}

  public async requestUploadLocator(input: RequestAssetUploadLocatorDto): Promise<AssetUploadLocatorDto> {
    AssetValidator.validate(input);

    const id = new AssetId(input.assetId);
    const existing = await this.assetRepository.findById(id);
    if (existing) {
      throw new Error(`Asset with id ${input.assetId} already exists`);
    }

    const reference = new AssetReference(input.assetReference);
    const uploadGrant = this.storageGateway.generateUploadGrant
      ? await this.storageGateway.generateUploadGrant(AssetStorageZone.QUARANTINE, {
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          byteSize: input.byteSize,
        })
      : undefined;
    const quarantineLocator = uploadGrant?.locator
      ?? await this.storageGateway.generateUploadLocator(AssetStorageZone.QUARANTINE);

    const record = new AssetRecord({
      id,
      reference,
      locator: quarantineLocator,
      metadata: new AssetMetadata(
        input.originalFilename,
        input.mimeType,
        input.fileExtension,
        input.byteSize
      ),
      retention: new AssetRetentionMetadata(
        input.retentionCategory ?? AssetRetentionCategory.PERMANENT,
        input.expiresAt ? new Date(input.expiresAt) : null
      ),
      owner: new AssetOwnerReference(input.ownerId, input.ownerType),
      classification: input.classification,
      state: undefined as any
    }, true);

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
      uploadGrant: uploadGrant ? {
        uploadUrl: uploadGrant.uploadUrl,
        method: uploadGrant.method,
        headers: uploadGrant.headers,
        expiresAt: uploadGrant.expiresAt.toISOString(),
      } : undefined,
    };
  }

  public async registerQuarantinedAsset(input: RegisterQuarantinedAssetDto): Promise<AssetRecordDto> {
    AssetValidator.validate(input);

    const id = new AssetId(input.assetId);
    const existing = await this.assetRepository.findById(id);
    if (existing) {
      throw new Error(`Asset with id ${input.assetId} already exists`);
    }

    const reference = new AssetReference(input.assetReference);
    const initialLocator = await this.storageGateway.generateUploadLocator(AssetStorageZone.QUARANTINE);

    const record = new AssetRecord({
      id,
      reference,
      locator: initialLocator,
      metadata: new AssetMetadata(
        input.originalFilename,
        input.mimeType,
        input.fileExtension,
        input.byteSize
      ),
      retention: new AssetRetentionMetadata(
        input.retentionCategory ?? AssetRetentionCategory.PERMANENT,
        input.expiresAt ? new Date(input.expiresAt) : null
      ),
      owner: new AssetOwnerReference(input.ownerId, input.ownerType),
      classification: input.classification,
      state: undefined as any
    }, true);

    record.assignQuarantineLocator(initialLocator);
    await this.assetRepository.save(record);

    return AssetRecordMapper.toDto(record);
  }
}
