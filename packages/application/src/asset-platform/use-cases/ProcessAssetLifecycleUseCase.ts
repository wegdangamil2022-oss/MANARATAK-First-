import {
  IAssetRecordRepository,
  IAssetStorageGateway,
  IAssetUsageRegistryGateway,
  IAssetMalwareScannerGateway,
  IAssetSanitizationGateway,
  AssetId,
  AssetStorageZone,
  AssetLifecycleState
} from '@manaratak/domain';

import {
  ValidateAssetDto,
  MarkAssetMalwareScanFailedDto,
  SanitizeAssetDto,
  ActivateAssetDto,
  ArchiveAssetDto,
  SoftDeleteAssetDto,
  RestoreAssetDto,
  PurgeAssetDto,
  AssetRecordDto,
  RequestAssetDeliveryGrantDto,
  AssetDeliveryGrantDto
} from '../dtos/AssetDtos';
import { AssetRecordMapper } from '../mappers/AssetRecordMapper';

export class ProcessAssetLifecycleUseCase {
  constructor(
    private readonly assetRepository: IAssetRecordRepository,
    private readonly storageGateway: IAssetStorageGateway,
    private readonly usageRegistry: IAssetUsageRegistryGateway,
    private readonly malwareScannerGateway?: IAssetMalwareScannerGateway,
    private readonly sanitizationGateway?: IAssetSanitizationGateway
  ) {}

  public async validateAsset(dto: ValidateAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.startValidation();

    if (!this.malwareScannerGateway) {
      throw new Error('ASSET_MALWARE_SCANNING_NOT_CONFIGURED');
    }
    const scanResult = await this.malwareScannerGateway.scan(record.locator);
    if (!scanResult.clean) {
      const reason = scanResult.threatsFound?.join(', ') || 'Malware detected during scan';
      record.failMalwareScan(reason);
      await this.assetRepository.save(record);
      return AssetRecordMapper.toDto(record);
    }
    record.passMalwareScan();

    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async markMalwareScanFailed(dto: MarkAssetMalwareScanFailedDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.failMalwareScan(dto.reason);
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async sanitizeAsset(dto: SanitizeAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.startSanitizing();

    if (!this.sanitizationGateway) {
      throw new Error('ASSET_SANITIZATION_NOT_CONFIGURED');
    }
    const result = await this.sanitizationGateway.sanitize(record.locator);
    record.completeSanitization(result.metadata, result.sanitizedLocator);

    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async activateAsset(dto: ActivateAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    const cleanLocator = await this.storageGateway.moveToCleanZone(record.locator);
    record.activate(cleanLocator);
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async requestDeliveryGrant(dto: RequestAssetDeliveryGrantDto): Promise<AssetDeliveryGrantDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) throw new Error(`Asset not found: ${dto.assetId}`);
    if (record.state !== AssetLifecycleState.ACTIVE || record.locator.storageZone !== AssetStorageZone.CLEAN) {
      throw new Error('ASSET_DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET');
    }
    if (!this.storageGateway.generateDeliveryGrant) {
      throw new Error('ASSET_SECURE_DELIVERY_NOT_CONFIGURED');
    }
    const grant = await this.storageGateway.generateDeliveryGrant(record.locator, dto.expiresInSeconds ?? 300);
    return {
      assetId: dto.assetId,
      url: grant.url,
      headers: grant.headers,
      expiresAt: grant.expiresAt.toISOString(),
    };
  }

  public async archiveAsset(dto: ArchiveAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.archive();
    await this.storageGateway.archive(record.locator);
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async softDeleteAsset(dto: SoftDeleteAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.softDelete();
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async restoreAsset(dto: RestoreAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.restore();
    await this.storageGateway.restore(record.locator);
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async purgeAsset(dto: PurgeAssetDto): Promise<void> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    const usages = this.usageRegistry.findUsages
      ? await this.usageRegistry.findUsages(id)
      : null;
    const inUse = usages ? usages.length > 0 : await this.usageRegistry.isAssetInUse(id);
    if (inUse) {
      const detail = usages?.length
        ? ` (${usages.map((usage) => `${usage.consumer}.${usage.field}`).join(', ')})`
        : '';
      throw new Error(`Cannot purge asset ${dto.assetId} because it is currently in use${detail}`);
    }

    record.purge();
    await this.storageGateway.delete(record.locator);
    await this.assetRepository.save(record);
  }
}
