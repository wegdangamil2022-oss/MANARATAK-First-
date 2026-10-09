import { SourceStatus, type ImportSourceDefinition } from '@manaratak/domain';
import type { IImportRawSnapshotStore, StoredImportRawSnapshot } from '../contracts/IImportRawSnapshotStore';
import type { SourceAcquisitionRequest, SourceAcquisitionResult } from '../contracts/ISourceConnector';
import { SourceConnectorRegistry } from '../services/SourceConnectorRegistry';
export interface ISourceAcquisitionLimiter { wait(source: ImportSourceDefinition): Promise<void>; }
export interface AcquireImportSourceResult { acquisition: SourceAcquisitionResult; snapshot: StoredImportRawSnapshot; attempts: number; }
export class AcquireImportSourceUseCase {
  constructor(private readonly registry: SourceConnectorRegistry, private readonly snapshots: IImportRawSnapshotStore, private readonly limiter?: ISourceAcquisitionLimiter,
    private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {}
  async execute(source: ImportSourceDefinition, request: SourceAcquisitionRequest = {}): Promise<AcquireImportSourceResult> {
    if (source.status !== SourceStatus.ACTIVE) throw new Error(`SOURCE_NOT_ACTIVE:${source.sourceId}`);
    const connector = this.registry.resolve(source);
    let attempts = 0; let acquisition: SourceAcquisitionResult | undefined;
    while (attempts < 3) {
      attempts++;
      await this.limiter?.wait(source);
      try {
        acquisition = await connector.acquire(source, request);
        break;
      } catch (error) {
        if (attempts >= 3 || !this.retryable(error)) throw error;
        const advice = error && typeof error === 'object'
          ? (error as { retryAfterMs?: unknown }).retryAfterMs : undefined;
        // Do not shorten a server-mandated cooldown. Long waits belong in an
        // asynchronous scheduler, rather than occupying an API request.
        if (typeof advice === 'number' && Number.isFinite(advice) && advice > 30_000) throw error;
        const delay = typeof advice === 'number' && Number.isFinite(advice) && advice >= 0
          ? Math.max(advice, 500 * 2 ** (attempts - 1)) : 500 * 2 ** (attempts - 1);
        await this.sleep(delay);
      }
    }
    if (!acquisition) throw new Error('SOURCE_ACQUISITION_EMPTY');
    const snapshot = await this.snapshots.store(acquisition); return { acquisition, snapshot, attempts };
  }
  private retryable(error: unknown): boolean {
    const value = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : null;
    const code = typeof value?.code === 'string' ? value.code : value?.message ?? error;
    return typeof code === 'string' && /^(SOURCE_HTTP_(408|429|500|502|503|504)|SOURCE_REQUEST_TIMEOUT|ECONNRESET|ETIMEDOUT)$/.test(code);
  }
}
