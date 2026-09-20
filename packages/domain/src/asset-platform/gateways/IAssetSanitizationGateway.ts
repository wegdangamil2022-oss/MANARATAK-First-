import { AssetStorageLocator } from '../value-objects/AssetStorageLocator';
import { AssetSanitizationMetadata } from '../value-objects/AssetSanitizationMetadata';

export interface SanitizationResult {
  sanitizedLocator: AssetStorageLocator;
  metadata: AssetSanitizationMetadata;
}

export interface IAssetSanitizationGateway {
  sanitize(locator: AssetStorageLocator): Promise<SanitizationResult>;
}
