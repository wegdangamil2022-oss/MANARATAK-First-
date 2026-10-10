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

export interface IImportSourceObservationGateway {
  cached(source: import('@manaratak/domain').ImportSourceDefinition): Promise<{ artifactId: string } | null>;
  remember(source: import('@manaratak/domain').ImportSourceDefinition, snapshot: StoredImportRawSnapshot): Promise<void>;
  observeShape(source: import('@manaratak/domain').ImportSourceDefinition, shape: Record<string, string[]>): Promise<void>;
  fallback(source: import('@manaratak/domain').ImportSourceDefinition): Promise<{ sourceId: string; sourceRevision: string } | null>;
}
