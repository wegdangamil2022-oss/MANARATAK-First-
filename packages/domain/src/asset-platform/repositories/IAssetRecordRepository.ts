import { AssetRecord } from '../aggregates/AssetRecord';
import { AssetId } from '../value-objects/AssetId';
import { AssetReference } from '../value-objects/AssetReference';
import { AssetOwnerReference } from '../value-objects/AssetOwnerReference';

export interface IAssetRecordRepository {
  save(asset: AssetRecord): Promise<void>;
  completeArchiveOperation?(asset: AssetRecord): Promise<void>;
  markArchiveRecoveryRequired?(asset: AssetRecord): Promise<void>;
  /** Bounded EAP-owned recovery read; never infers a new activation request. */
  findPendingActivations?(before: Date, limit: number): Promise<Array<{ assetId: string; operationId: string }>>;
  /** Reserve DELETED state before external restore, fencing both retention claims and stale purges. */
  acquireRestoreLease?(asset: AssetRecord): Promise<void>;
  /** Release a failed restore's lease only if still owned; never clear another worker's claim. */
  releaseRestoreLease?(asset: AssetRecord): Promise<void>;
  /** Persist provider-start intent before effects; pending intents outlive lease expiry. */
  markRestoreProviderStarted?(asset: AssetRecord): Promise<void>;
  renewRestoreLease?(asset: AssetRecord): Promise<void>;
  /** Preserve the durable safety barrier after any uncertain provider/verification/commit outcome. */
  markRestoreRecoveryRequired?(asset: AssetRecord): Promise<void>;
  /** Fail closed unless the exact restore lease is still live and DB state remains DELETED. */
  assertRestoreLeaseOwned?(asset: AssetRecord): Promise<void>;
  findById(id: AssetId): Promise<AssetRecord | null>;
  findByReference(reference: AssetReference): Promise<AssetRecord | null>;
  findByOwner(owner: AssetOwnerReference): Promise<AssetRecord[]>;
  /** Fail-closed check for legal holds, active retention claims and expiry before irreversible purge. */
  assertPurgeAllowed?(id: AssetId, at: Date, retentionClaimToken?: string, retryPurgedCleanup?: boolean): Promise<void>;
}
