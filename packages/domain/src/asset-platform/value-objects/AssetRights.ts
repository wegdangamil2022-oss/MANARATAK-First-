export interface AssetRights {
  rightsSource: string;
  attribution: string;
  usageScope: 'PUBLIC' | 'INTERNAL';
  publicationPolicy: 'ADVISORY' | 'MANDATORY';
  expiresAt?: string;
}
export function validateAssetRights(value: unknown): AssetRights {
  const rights = value as AssetRights;
  if (
    !rights ||
    typeof rights.rightsSource !== 'string' ||
    !rights.rightsSource.trim() ||
    rights.rightsSource.length > 2000 ||
    typeof rights.attribution !== 'string' ||
    rights.attribution.length > 2000 ||
    !['PUBLIC', 'INTERNAL'].includes(rights.usageScope) ||
    !['ADVISORY', 'MANDATORY'].includes(rights.publicationPolicy) ||
    (rights.expiresAt !== undefined && !Number.isFinite(Date.parse(rights.expiresAt)))
  )
    throw new Error('ASSET_RIGHTS_INVALID');
  return {
    ...rights,
    rightsSource: rights.rightsSource.trim(),
    attribution: rights.attribution.trim(),
  };
}
export function assetRightsStatus(
  value: unknown,
  at = new Date(),
): 'UNSPECIFIED' | 'CURRENT' | 'EXPIRED' {
  if (value == null) return 'UNSPECIFIED';
  const rights = validateAssetRights(value);
  return rights.expiresAt && Date.parse(rights.expiresAt) <= at.getTime() ? 'EXPIRED' : 'CURRENT';
}
export function assertAssetPublicRights(value: unknown, at = new Date()): void {
  if (value == null) return; // Explicit UNSPECIFIED advisory status; no assumed license.
  const rights = validateAssetRights(value);
  if (
    rights.publicationPolicy === 'MANDATORY' &&
    (rights.usageScope !== 'PUBLIC' || assetRightsStatus(rights, at) === 'EXPIRED')
  )
    throw new Error('ASSET_PUBLIC_RIGHTS_REQUIRED');
}
