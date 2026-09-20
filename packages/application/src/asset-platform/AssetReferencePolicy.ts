import {
  AssetId,
  AssetLifecycleState,
  AssetRecord,
  AssetSecurityClassification,
  IAssetRecordRepository,
} from '@manaratak/domain';

export interface AssetReferencePolicyOptions {
  purpose: string;
  allowedStates?: readonly AssetLifecycleState[];
  allowedClassifications?: readonly AssetSecurityClassification[];
  expectedOwnerId?: string;
  allowedOwnerTypes?: readonly string[];
  allowedMimeTypePrefixes?: readonly string[];
}

const DEFAULT_STATES = [AssetLifecycleState.ACTIVE] as const;
const DEFAULT_CLASSIFICATIONS = [
  AssetSecurityClassification.PUBLIC,
  AssetSecurityClassification.INTERNAL,
] as const;

export class AssetReferencePolicy {
  constructor(private readonly assetRepository: IAssetRecordRepository) {}

  public async assertUsable(
    assetId: string | null | undefined,
    options: AssetReferencePolicyOptions,
  ): Promise<AssetRecord | null> {
    if (assetId == null || assetId === '') return null;
    if (/^(?:https?:\/\/|data:|blob:|file:|[a-zA-Z]:\\|\/)/i.test(assetId)) {
      throw new Error(`${options.purpose}_RAW_ASSET_REFERENCE_FORBIDDEN`);
    }

    const asset = await this.assetRepository.findById(new AssetId(assetId));
    if (!asset) throw new Error(`${options.purpose}_ASSET_NOT_FOUND`);

    const allowedStates = options.allowedStates ?? DEFAULT_STATES;
    if (!allowedStates.includes(asset.state)) {
      throw new Error(`${options.purpose}_ASSET_STATE_NOT_ALLOWED:${asset.state}`);
    }

    const allowedClassifications = options.allowedClassifications ?? DEFAULT_CLASSIFICATIONS;
    if (!allowedClassifications.includes(asset.classification)) {
      throw new Error(`${options.purpose}_ASSET_CLASSIFICATION_NOT_ALLOWED:${asset.classification}`);
    }

    if (options.expectedOwnerId && asset.owner.ownerId !== options.expectedOwnerId) {
      throw new Error(`${options.purpose}_ASSET_OWNER_MISMATCH`);
    }
    if (options.allowedOwnerTypes?.length && !options.allowedOwnerTypes.includes(asset.owner.ownerType)) {
      throw new Error(`${options.purpose}_ASSET_OWNER_TYPE_NOT_ALLOWED:${asset.owner.ownerType}`);
    }

    if (options.allowedMimeTypePrefixes?.length) {
      const mimeType = asset.metadata.mimeType.toLowerCase();
      const allowed = options.allowedMimeTypePrefixes.some((prefix) => mimeType.startsWith(prefix.toLowerCase()));
      if (!allowed) throw new Error(`${options.purpose}_ASSET_MIME_NOT_ALLOWED:${asset.metadata.mimeType}`);
    }

    return asset;
  }

  public async assertAllUsable(
    assetIds: Array<string | null | undefined>,
    options: AssetReferencePolicyOptions,
  ): Promise<void> {
    for (const assetId of assetIds) await this.assertUsable(assetId, options);
  }
}


export async function assertAssetReferenceUsable(
  policy: AssetReferencePolicy | undefined,
  assetId: string | null | undefined,
  options: AssetReferencePolicyOptions,
): Promise<AssetRecord | null> {
  if (assetId == null || assetId === '') return null;
  if (!policy) throw new Error(`${options.purpose}_ASSET_REFERENCE_POLICY_REQUIRED`);
  return policy.assertUsable(assetId, options);
}

export async function assertAssetReferencesUsable(
  policy: AssetReferencePolicy | undefined,
  assetIds: Array<string | null | undefined>,
  options: AssetReferencePolicyOptions,
): Promise<void> {
  const nonEmpty = assetIds.filter((assetId): assetId is string => assetId != null && assetId !== '');
  if (nonEmpty.length === 0) return;
  if (!policy) throw new Error(`${options.purpose}_ASSET_REFERENCE_POLICY_REQUIRED`);
  await policy.assertAllUsable(nonEmpty, options);
}
