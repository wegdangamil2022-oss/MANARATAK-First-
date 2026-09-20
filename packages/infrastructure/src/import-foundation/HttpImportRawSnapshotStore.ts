import { createHash } from 'node:crypto';
import type { IImportRawSnapshotStore, SourceAcquisitionResult, StoredImportRawSnapshot } from '@manaratak/application';
import { SignedProviderHttpClient, type SignedProviderHttpClientOptions } from '../provider-http/SignedProviderHttpClient';

interface ProviderSnapshotDto {
  artifactId: string;
  rawArtifactReference: string;
  contentHash: string;
  byteSize: number;
  storedAt: string;
  retentionExpiresAt?: string;
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  fetchedAt: string;
  requestedUrl?: string;
  finalUrl?: string;
  statusCode?: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
}

interface SnapshotLookupResponse { snapshot: ProviderSnapshotDto | null; }
interface SnapshotReadResponse { artifactId: string; contentHash: string; rawBase64: string; }

export interface HttpImportRawSnapshotStoreOptions extends SignedProviderHttpClientOptions {
  retentionDays?: number;
  now?: () => Date;
}

const ARTIFACT_PATTERN = /^raw_[a-f0-9]{64}$/;
const parseDate = (value: string | undefined, code: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed;
};

export class HttpImportRawSnapshotStore implements IImportRawSnapshotStore {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;
  public readonly persistenceClassification = 'DURABLE' as const;
  public readonly isProductionReady = true as const;
  private readonly client: SignedProviderHttpClient;
  private readonly retentionDays: number;
  private readonly now: () => Date;

  constructor(options: HttpImportRawSnapshotStoreOptions) {
    this.client = new SignedProviderHttpClient(options);
    this.retentionDays = options.retentionDays ?? 365;
    if (!Number.isSafeInteger(this.retentionDays) || this.retentionDays < 1 || this.retentionDays > 3650) {
      throw new Error('IMPORT_RAW_RETENTION_DAYS_INVALID');
    }
    this.now = options.now ?? (() => new Date());
  }

  async store(acquisition: SourceAcquisitionResult): Promise<StoredImportRawSnapshot> {
    const contentHash = createHash('sha256').update(acquisition.rawBytes).digest('hex');
    const identityHash = createHash('sha256').update(JSON.stringify({ contentHash, sourceId: acquisition.sourceId, connectorId: acquisition.connectorId, connectorVersion: acquisition.connectorVersion, fetchedAt: acquisition.fetchedAt.toISOString(), requestedUrl: acquisition.requestedUrl ?? null, finalUrl: acquisition.finalUrl ?? null })).digest('hex');
    const artifactId = `raw_${identityHash}`;
    const requestedAt = this.now();
    const retentionExpiresAt = new Date(acquisition.fetchedAt.getTime() + this.retentionDays * 86_400_000);
    const body = {
      artifactId,
      contentHash,
      byteSize: acquisition.rawBytes.byteLength,
      rawBase64: Buffer.from(acquisition.rawBytes).toString('base64'),
      requestedAt: requestedAt.toISOString(),
      retentionExpiresAt: retentionExpiresAt.toISOString(),
      retentionClass: 'IMPORT_RAW_PROVENANCE',
      sourceId: acquisition.sourceId,
      connectorId: acquisition.connectorId,
      connectorVersion: acquisition.connectorVersion,
      fetchedAt: acquisition.fetchedAt.toISOString(),
      requestedUrl: acquisition.requestedUrl,
      finalUrl: acquisition.finalUrl,
      statusCode: acquisition.statusCode,
      contentType: acquisition.contentType,
      etag: acquisition.etag,
      lastModified: acquisition.lastModified,
    };
    const response = await this.client.json<ProviderSnapshotDto>('PUT', `/v1/import-raw-snapshots/${artifactId}`, body, {
      idempotencyKey: `import-raw:${identityHash}`,
    });
    const stored = this.parseSnapshot(response);
    if (stored.artifactId !== artifactId || stored.contentHash !== contentHash || stored.byteSize !== acquisition.rawBytes.byteLength) {
      throw new Error('IMPORT_RAW_PROVIDER_IMMUTABILITY_MISMATCH');
    }
    if (stored.sourceId !== acquisition.sourceId || stored.connectorId !== acquisition.connectorId || stored.connectorVersion !== acquisition.connectorVersion) {
      throw new Error('IMPORT_RAW_PROVIDER_PROVENANCE_MISMATCH');
    }
    if (!stored.retentionExpiresAt || stored.retentionExpiresAt.getTime() !== retentionExpiresAt.getTime()) {
      throw new Error('IMPORT_RAW_PROVIDER_RETENTION_MISMATCH');
    }
    return stored;
  }

  async get(artifactId: string): Promise<StoredImportRawSnapshot | null> {
    if (!ARTIFACT_PATTERN.test(artifactId)) return null;
    const response = await this.client.json<SnapshotLookupResponse>('POST', '/v1/import-raw-snapshots/lookup', { artifactId });
    if (!response?.snapshot) return null;
    const snapshot = this.parseSnapshot(response.snapshot);
    if (snapshot.artifactId !== artifactId) throw new Error('IMPORT_RAW_PROVIDER_LOOKUP_ID_MISMATCH');
    return snapshot;
  }

  async read(artifactId: string): Promise<Uint8Array | null> {
    if (!ARTIFACT_PATTERN.test(artifactId)) return null;
    const response = await this.client.json<SnapshotReadResponse>('POST', '/v1/import-raw-snapshots/read', { artifactId });
    if (!response) return null;
    if (response.artifactId !== artifactId || !/^[a-f0-9]{64}$/.test(response.contentHash) || typeof response.rawBase64 !== 'string') {
      throw new Error('IMPORT_RAW_PROVIDER_READ_RESPONSE_INVALID');
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(response.rawBase64)) throw new Error('IMPORT_RAW_PROVIDER_READ_BASE64_INVALID');
    const bytes = new Uint8Array(Buffer.from(response.rawBase64, 'base64'));
    if (Buffer.from(bytes).toString('base64') !== response.rawBase64) throw new Error('IMPORT_RAW_PROVIDER_READ_BASE64_INVALID');
    const actualHash = createHash('sha256').update(bytes).digest('hex');
    if (actualHash !== response.contentHash) throw new Error('IMPORT_RAW_PROVIDER_READ_HASH_MISMATCH');
    return bytes;
  }

  private parseSnapshot(value: ProviderSnapshotDto): StoredImportRawSnapshot {
    if (!value || !ARTIFACT_PATTERN.test(value.artifactId) || !/^[a-f0-9]{64}$/.test(value.contentHash)) throw new Error('IMPORT_RAW_PROVIDER_METADATA_INVALID');
    if (!Number.isSafeInteger(value.byteSize) || value.byteSize < 0) throw new Error('IMPORT_RAW_PROVIDER_METADATA_INVALID');
    if (!value.rawArtifactReference || /^(?:file|memory):/i.test(value.rawArtifactReference)) throw new Error('IMPORT_RAW_PROVIDER_REFERENCE_NOT_DURABLE');
    const storedAt = parseDate(value.storedAt, 'IMPORT_RAW_PROVIDER_STORED_AT_INVALID');
    const fetchedAt = parseDate(value.fetchedAt, 'IMPORT_RAW_PROVIDER_FETCHED_AT_INVALID');
    if (!storedAt || !fetchedAt) throw new Error('IMPORT_RAW_PROVIDER_METADATA_INVALID');
    const retentionExpiresAt = parseDate(value.retentionExpiresAt, 'IMPORT_RAW_PROVIDER_RETENTION_INVALID');
    if (retentionExpiresAt && retentionExpiresAt.getTime() <= fetchedAt.getTime()) throw new Error('IMPORT_RAW_PROVIDER_RETENTION_INVALID');
    const { retentionExpiresAt: _rawRetentionExpiresAt, ...snapshot } = value;
    return {
      ...snapshot,
      storedAt,
      fetchedAt,
      ...(retentionExpiresAt ? { retentionExpiresAt } : {}),
    };
  }
}
