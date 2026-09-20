import { AssetId } from '../value-objects/AssetId';

export interface AssetUsageReference {
  consumer: string;
  field: string;
}

export interface IAssetUsageRegistryGateway {
  isAssetInUse(id: AssetId): Promise<boolean>;
  findUsages?(id: AssetId): Promise<AssetUsageReference[]>;
  registerUsage(id: AssetId, consumerUrn: string): Promise<void>;
  unregisterUsage(id: AssetId, consumerUrn: string): Promise<void>;
}
