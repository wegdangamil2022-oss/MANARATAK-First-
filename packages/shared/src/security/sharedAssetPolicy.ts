/** Shared EAP administration never authorizes private owner workflows. */
export const SHARED_ASSET_OWNER_TYPES = [
  'UNIVERSITY', 'SCHOLARSHIP', 'COURSE', 'CMS', 'CMS_CONTENT',
  'STUDY_DESTINATION', 'REFERENCE_COUNTRY', 'STUDENT_TOOL', 'SERVICE_CATALOG',
  'CAREER_EMPLOYER', 'INTERNATIONAL_TEST', 'CERTIFICATE_ISSUER', 'CERTIFICATE_TEMPLATE',
] as const;

export function isSharedAssetOwner(ownerType: string): boolean {
  return (SHARED_ASSET_OWNER_TYPES as readonly string[]).includes(ownerType.toUpperCase());
}

export function isSharedAdminAsset(asset: { owner?: { ownerType: string }; ownerType?: string; classification?: string; securityClassification?: string }): boolean {
  return isSharedAssetOwner(asset.owner?.ownerType ?? asset.ownerType ?? '') &&
    ['PUBLIC', 'INTERNAL'].includes(asset.classification ?? asset.securityClassification ?? '');
}
