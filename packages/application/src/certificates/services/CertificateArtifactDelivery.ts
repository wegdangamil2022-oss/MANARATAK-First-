import type {ProcessAssetLifecycleUseCase} from '../../asset-platform/use-cases/ProcessAssetLifecycleUseCase';

/** Keep provider capabilities server-side and reauthorize after bounded storage IO. */
export async function readCertificateArtifact(
  kind: 'pdf' | 'preview',
  authorize: () => Promise<string>,
  reader: Pick<ProcessAssetLifecycleUseCase, 'readAuthenticatedDelivery'> | undefined,
) {
  if (!reader) throw new Error('CERTIFICATE_DELIVERY_NOT_CONFIGURED');
  const assetId = await authorize();
  const content = await reader.readAuthenticatedDelivery(assetId);
  if (await authorize() !== assetId) throw new Error('CERTIFICATE_ARTIFACT_CHANGED');
  const allowed = kind === 'pdf'
    ? ['application/pdf']
    : ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
  if (!allowed.includes(content.mimeType)) throw new Error('CERTIFICATE_ARTIFACT_MIME_INVALID');
  return content;
}
