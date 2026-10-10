import { createHash } from 'node:crypto';
import { AssetId, AssetLifecycleState, IAssetRecordRepository } from '@manaratak/domain';
import { ProcessAssetLifecycleUseCase } from '@manaratak/application';

export class EapCertificateVisualAssetResolver {
  constructor(
    private readonly assets: IAssetRecordRepository,
    private readonly lifecycle: ProcessAssetLifecycleUseCase,
  ) {}
  public async resolve(
    id: string,
    expectedHash: string,
  ): Promise<{ bytes: Uint8Array; mimeType: string }> {
    const asset = await this.assets.findById(new AssetId(id));
    if (
      !asset ||
      asset.state !== AssetLifecycleState.ACTIVE ||
      asset.checksum?.hash !== expectedHash ||
      !['image/png', 'image/jpeg'].includes(asset.metadata.mimeType)
    )
      throw new Error('CERTIFICATE_VISUAL_ASSET_INVALID');
    const grant = await this.lifecycle.requestDeliveryGrant({ assetId: id, expiresInSeconds: 60 });
    const response = await fetch(grant.url, {
      headers: grant.headers,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !response.body) throw new Error('CERTIFICATE_VISUAL_ASSET_FETCH_FAILED');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2 * 1024 * 1024) throw new Error('CERTIFICATE_VISUAL_ASSET_TOO_LARGE');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = Buffer.concat(chunks);
    if (!bytes.byteLength || createHash('sha256').update(bytes).digest('hex') !== expectedHash)
      throw new Error('CERTIFICATE_VISUAL_ASSET_HASH_MISMATCH');
    return { bytes, mimeType: asset.metadata.mimeType };
  }
}
