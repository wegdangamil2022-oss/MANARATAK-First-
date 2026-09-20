import { createHash } from 'node:crypto';
import type { IImportRawSnapshotStore, SourceAcquisitionResult, StoredImportRawSnapshot } from '@manaratak/application';

export class InMemoryImportRawSnapshotStore implements IImportRawSnapshotStore {
  public readonly persistenceClassification = 'IN_MEMORY_TEST_ONLY' as const;
  private readonly snapshots = new Map<string, StoredImportRawSnapshot>();
  private readonly contents = new Map<string, Uint8Array>();

  async store(acquisition: SourceAcquisitionResult): Promise<StoredImportRawSnapshot> {
    const sha256 = createHash('sha256').update(acquisition.rawBytes).digest('hex');
    const identityHash = createHash('sha256').update(JSON.stringify({ contentHash: sha256, sourceId: acquisition.sourceId, connectorId: acquisition.connectorId, connectorVersion: acquisition.connectorVersion, fetchedAt: acquisition.fetchedAt.toISOString(), requestedUrl: acquisition.requestedUrl ?? null, finalUrl: acquisition.finalUrl ?? null })).digest('hex');
    const artifactId = `raw_${identityHash}`;
    const existing = this.snapshots.get(artifactId);
    if (existing) return existing;
    const stored: StoredImportRawSnapshot = {
      artifactId,
      contentHash: sha256,
      byteSize: acquisition.rawBytes.byteLength,
      storedAt: new Date(),
      rawArtifactReference: `memory://import-raw/${sha256}`,
      sourceId: acquisition.sourceId,
      connectorId: acquisition.connectorId,
      connectorVersion: acquisition.connectorVersion,
      fetchedAt: acquisition.fetchedAt,
      requestedUrl: acquisition.requestedUrl,
      finalUrl: acquisition.finalUrl,
      statusCode: acquisition.statusCode,
      contentType: acquisition.contentType,
      etag: acquisition.etag,
      lastModified: acquisition.lastModified,
    };
    this.snapshots.set(artifactId, stored);
    this.contents.set(artifactId, acquisition.rawBytes.slice());
    return stored;
  }

  async get(snapshotId: string): Promise<StoredImportRawSnapshot | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }

  async read(snapshotId: string): Promise<Uint8Array | null> {
    const bytes = this.contents.get(snapshotId);
    return bytes ? bytes.slice() : null;
  }
}
