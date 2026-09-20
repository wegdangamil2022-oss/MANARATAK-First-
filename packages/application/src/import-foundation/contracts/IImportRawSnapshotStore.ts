import type { SourceAcquisitionResult } from './ISourceConnector';

export interface StoredImportRawSnapshot {
  artifactId: string;
  rawArtifactReference: string;
  contentHash: string;
  byteSize: number;
  storedAt: Date;
  retentionExpiresAt?: Date;
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  fetchedAt: Date;
  requestedUrl?: string;
  finalUrl?: string;
  statusCode?: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
}

export interface IImportRawSnapshotStore {
  store(result: SourceAcquisitionResult): Promise<StoredImportRawSnapshot>;
  get(artifactId: string): Promise<StoredImportRawSnapshot | null>;
  read(artifactId: string): Promise<Uint8Array | null>;
}
