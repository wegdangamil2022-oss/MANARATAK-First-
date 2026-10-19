import { createHash } from 'node:crypto';
import {
  AssetId,
  AssetLifecycleState,
  AssetSecurityClassification,
  type IAssetRecordRepository,
} from '@absheer/domain';
import type { ProcessAssetLifecycleUseCase } from '@absheer/application';
export class CertificateArtifactReadinessProbe {
  constructor(
    private readonly assets: IAssetRecordRepository,
    private readonly lifecycle: ProcessAssetLifecycleUseCase,
    private readonly worker: () => {
      state: string;
      lastSuccessAt?: string | null;
    },
    private readonly fixture: { assetId?: string; sha256?: string },
  ) {}
  async run(): Promise<{
    status: 'READY' | 'DEGRADED' | 'RUNTIME_PENDING' | 'NOT_CONFIGURED';
    reason: string;
    verifiedAt?: string;
  }> {
    const worker = this.worker();
    if (worker.state === 'STOPPED')
      return {
        status: 'NOT_CONFIGURED',
        reason: 'Completion worker is stopped',
      };
    const lastSuccess = Date.parse(worker.lastSuccessAt ?? '');
    if (
      worker.state === 'DEGRADED' ||
      !Number.isFinite(lastSuccess) ||
      lastSuccess > Date.now() + 30000 ||
      Date.now() - lastSuccess > 60000
    )
      return {
        status: 'DEGRADED',
        reason: 'No recent successful worker iteration',
      };
    if (!this.fixture.assetId || !this.fixture.sha256)
      return {
        status: 'RUNTIME_PENDING',
        reason:
          'A non-personal, pinned EAP PDF fixture is required for the delivery probe',
      };
    try {
      if (!/^[a-f0-9]{64}$/i.test(this.fixture.sha256))
        throw new Error('PROBE_HASH_INVALID');
      const asset = await this.assets.findById(
        new AssetId(this.fixture.assetId),
      );
      if (
        !asset ||
        asset.state !== AssetLifecycleState.ACTIVE ||
        asset.classification === AssetSecurityClassification.PUBLIC ||
        asset.owner.ownerType !== 'CertificateRuntimeProbe' ||
        asset.metadata.mimeType !== 'application/pdf' ||
        asset.checksum?.hash !== this.fixture.sha256
      )
        throw new Error('PROBE_ASSET_INVALID');
      const grant = await this.lifecycle.requestDeliveryGrant({
        assetId: asset.id.value,
        expiresInSeconds: 60,
      });
      const response = await fetch(grant.url, {
        headers: grant.headers,
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || !response.body)
        throw new Error('PROBE_DELIVERY_FAILED');
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2 * 1024 * 1024) throw new Error('PROBE_TOO_LARGE');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = Buffer.concat(chunks);
      if (
        bytes.subarray(0, 5).toString('ascii') !== '%PDF-' ||
        bytes.byteLength !== asset.metadata.byteSize ||
        createHash('sha256').update(bytes).digest('hex') !== this.fixture.sha256
      )
        throw new Error('PROBE_BYTES_INVALID');
      return {
        status: 'READY',
        reason: 'Recent worker and pinned private PDF delivery verified',
        verifiedAt: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'DEGRADED',
        reason: 'Pinned private PDF storage/delivery probe failed',
      };
    }
  }
}
