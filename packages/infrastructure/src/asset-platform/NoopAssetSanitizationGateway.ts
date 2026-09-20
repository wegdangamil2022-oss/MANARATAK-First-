import {
  IAssetSanitizationGateway,
  AssetStorageLocator,
  SanitizationResult
} from '@manaratak/domain';

export class NoopAssetSanitizationGateway implements IAssetSanitizationGateway {
  public readonly capabilityStatus = 'UNAVAILABLE' as const;

  async sanitize(_locator: AssetStorageLocator): Promise<SanitizationResult> {
    throw new Error('ASSET_SANITIZATION_UNAVAILABLE');
  }
}
