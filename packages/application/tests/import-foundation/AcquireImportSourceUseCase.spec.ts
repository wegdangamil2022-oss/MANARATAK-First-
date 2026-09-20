import { describe, expect, it, vi } from 'vitest';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import { AcquireImportSourceUseCase, SourceConnectorRegistry, type IImportRawSnapshotStore, type ISourceConnector } from '../../src';
const source = new ImportSourceDefinition({ sourceId: 's1', displayName: 'S1', baseUrl: 'https://example.com/data', category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, status: SourceStatus.ACTIVE, connectorId: 'official-api', connectorVersion: '2.0.0' });
describe('AcquireImportSourceUseCase', () => {
  it('retries a transient error and persists the raw snapshot before returning', async () => {
    let calls = 0; const connector: ISourceConnector = { connectorId: 'official-api', connectorVersion: '2.0.0', category: SourceConnectorCategory.OFFICIAL_API, supports: () => true, getSignature: vi.fn(), acquire: async () => { if (++calls === 1) throw new Error('SOURCE_HTTP_503'); return { sourceId: 's1', connectorId: 'official-api', connectorVersion: '2.0.0', rawBytes: new Uint8Array([7]), fetchedAt: new Date() }; } };
    const store = vi.fn(async () => ({ artifactId: 'raw_hash', contentHash: 'hash', byteSize: 1, storedAt: new Date(), rawArtifactReference: 'fixture://raw_hash', sourceId: 's1', connectorId: 'official-api', connectorVersion: '2.0.0', fetchedAt: new Date() }));
    const result = await new AcquireImportSourceUseCase(new SourceConnectorRegistry([connector]), { store, get: vi.fn() } as IImportRawSnapshotStore).execute(source);
    expect(result.attempts).toBe(2); expect(store).toHaveBeenCalledOnce(); expect(result.snapshot.artifactId).toBe('raw_hash');
  });
  it('fails closed when connector version differs', () => { const connector = { connectorId: 'official-api', connectorVersion: '1.0.0', supports: () => true } as ISourceConnector; expect(() => new SourceConnectorRegistry([connector]).resolve(source)).toThrow('SOURCE_CONNECTOR_VERSION_MISMATCH'); });
  it('fails closed when connector ID is not registered', () => { expect(() => new SourceConnectorRegistry([]).resolve(source)).toThrow('SOURCE_CONNECTOR_NOT_REGISTERED'); });
});
