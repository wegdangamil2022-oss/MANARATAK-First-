import { AssetRecord } from '../aggregates/AssetRecord';
import { AssetId } from '../value-objects/AssetId';
import { AssetReference } from '../value-objects/AssetReference';
import { AssetOwnerReference } from '../value-objects/AssetOwnerReference';

export interface IAssetRecordRepository {
  save(asset: AssetRecord): Promise<void>;
  findById(id: AssetId): Promise<AssetRecord | null>;
  findByReference(reference: AssetReference): Promise<AssetRecord | null>;
  findByOwner(owner: AssetOwnerReference): Promise<AssetRecord[]>;
  /** Fail-closed check for legal holds, active retention claims and expiry before irreversible purge. */
  assertPurgeAllowed?(id: AssetId, at: Date, retentionClaimToken?: string): Promise<void>;
}
