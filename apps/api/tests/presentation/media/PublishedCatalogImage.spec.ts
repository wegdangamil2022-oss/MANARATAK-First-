import { describe, expect, it, vi } from 'vitest';
import { publishedCatalogImage } from '../../../src/presentation/media/PublishedCatalogImage';
const fixture = () => ({
  assetReferencePolicy: { assertUsable: vi.fn().mockResolvedValue({ id: 'public-fixture' }) },
  processAssetLifecycleUseCase: { requestDeliveryGrant: vi.fn().mockResolvedValue({ url: 'https://media.example.test/signed', expiresAt: new Date(Date.now() + 240000).toISOString(), headers: {} }) },
});
describe('published owner image projection, existing asset policy', () => {
  it('issues a bounded image-only public grant without exposing asset metadata or headers', async () => {
    const services = fixture(); const result = await publishedCatalogImage('public-fixture', 'UNIVERSITY_LOGO', services);
    expect(services.assetReferencePolicy.assertUsable).toHaveBeenCalledWith('public-fixture', expect.objectContaining({ purpose: 'UNIVERSITY_LOGO', publicPublication: true, allowedClassifications: ['PUBLIC'], allowedMimeTypePrefixes: ['image/'] }));
    expect(services.processAssetLifecycleUseCase.requestDeliveryGrant).toHaveBeenCalledWith({ assetId: 'public-fixture', expiresInSeconds: 300 });
    expect(Object.keys(result!)).toEqual(['url', 'expiresAt']);
  });
  it('does not issue a grant after denied/private/revoked asset policy', async () => {
    const services = fixture(); services.assetReferencePolicy.assertUsable.mockRejectedValue(new Error('PUBLIC_RIGHTS_DENIED'));
    expect(await publishedCatalogImage('private-fixture', 'COURSE_THUMBNAIL', services)).toBeNull();
    expect(services.processAssetLifecycleUseCase.requestDeliveryGrant).not.toHaveBeenCalled();
  });
  it.each([
    { url: 'http://media.example.test/image' }, { url: 'https://user:secret@media.example.test/image' },
    { headers: { authorization: 'private' } }, { expiresAt: new Date(0).toISOString() },
    { expiresAt: new Date(Date.now() + 600000).toISOString() },
  ])('fails closed for an invalid browser grant %j', async bad => {
    const services = fixture(); const grant = await services.processAssetLifecycleUseCase.requestDeliveryGrant();
    services.processAssetLifecycleUseCase.requestDeliveryGrant.mockResolvedValue({ ...grant, ...bad });
    expect(await publishedCatalogImage('public-fixture', 'COURSE_THUMBNAIL', services)).toBeNull();
  });
  it('keeps absent imagery or delivery unavailable without failing the owner response', async () => {
    expect(await publishedCatalogImage(null, 'COURSE_THUMBNAIL', {})).toBeNull();
    const services = fixture(); services.processAssetLifecycleUseCase.requestDeliveryGrant.mockRejectedValue(new Error('provider offline'));
    expect(await publishedCatalogImage('public-fixture', 'COURSE_THUMBNAIL', services)).toBeNull();
  });
});
