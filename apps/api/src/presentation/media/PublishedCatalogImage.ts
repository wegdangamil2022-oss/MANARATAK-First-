import type { AssetReferencePolicy, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { AssetSecurityClassification } from '@manaratak/domain';

export interface PublishedCatalogImageServices {
  assetReferencePolicy?: Pick<AssetReferencePolicy, 'assertUsable'>;
  processAssetLifecycleUseCase?: Pick<ProcessAssetLifecycleUseCase, 'requestDeliveryGrant'>;
}

/** Only call after the owner has returned its published projection, never on raw/draft rows. */
export async function publishedCatalogImage(
  assetId: string | null | undefined,
  purpose: 'UNIVERSITY_LOGO' | 'COURSE_THUMBNAIL',
  services: PublishedCatalogImageServices,
): Promise<{ url: string; expiresAt: string } | null> {
  if (!assetId || !services.assetReferencePolicy || !services.processAssetLifecycleUseCase) return null;
  try {
    const asset = await services.assetReferencePolicy.assertUsable(assetId, {
      purpose, publicPublication: true, allowedClassifications: [AssetSecurityClassification.PUBLIC], allowedMimeTypePrefixes: ['image/'],
    });
    if (!asset) return null;
    const grant = await services.processAssetLifecycleUseCase.requestDeliveryGrant({ assetId, expiresInSeconds: 300 });
    const url = new URL(grant.url);
    const expiry = Date.parse(grant.expiresAt);
    if (url.protocol !== 'https:' || url.username || url.password || Object.keys(grant.headers).length ||
        !Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 300000) return null;
    return { url: grant.url, expiresAt: grant.expiresAt };
  } catch {
    // Missing/revoked/ineligible imagery never takes down the published catalog or exposes locators.
    return null;
  }
}
