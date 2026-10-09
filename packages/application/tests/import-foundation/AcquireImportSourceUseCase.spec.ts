import { describe, expect, it, vi } from 'vitest';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import { AcquireImportSourceUseCase, SourceConnectorRegistry, type IImportRawSnapshotStore, type ISourceConnector, SourceHttpError } from '../../src';
const source = new ImportSourceDefinition({ sourceId: 's1', displayName: 'S1', baseUrl: 'https://example.com/data', category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, status: SourceStatus.ACTIVE, connectorId: 'official-api', connectorVersion: '2.0.0' });
describe('AcquireImportSourceUseCase', () => {
  it('retries a transient error and persists the raw snapshot before returning', async () => {
    let calls = 0; const connector: ISourceConnector = { connectorId: 'official-api', connectorVersion: '2.0.0', category: SourceConnectorCategory.OFFICIAL_API, supports: () => true, getSignature: vi.fn(), acquire: async () => { if (++calls === 1) throw new Error('SOURCE_HTTP_503'); return { sourceId: 's1', connectorId: 'official-api', connectorVersion: '2.0.0', rawBytes: new Uint8Array([7]), fetchedAt: new Date() }; } };
    const store = vi.fn(async () => ({ artifactId: 'raw_hash', contentHash: 'hash', byteSize: 1, storedAt: new Date(), rawArtifactReference: 'fixture://raw_hash', sourceId: 's1', connectorId: 'official-api', connectorVersion: '2.0.0', fetchedAt: new Date() }));
    const result = await new AcquireImportSourceUseCase(new SourceConnectorRegistry([connector]), { store, get: vi.fn() } as IImportRawSnapshotStore, undefined, async () => undefined).execute(source);
    expect(result.attempts).toBe(2); expect(store).toHaveBeenCalledOnce(); expect(result.snapshot.artifactId).toBe('raw_hash');
  });
  it('fails closed when connector version differs', () => { const connector = { connectorId: 'official-api', connectorVersion: '1.0.0', supports: () => true } as ISourceConnector; expect(() => new SourceConnectorRegistry([connector]).resolve(source)).toThrow('SOURCE_CONNECTOR_VERSION_MISMATCH'); });
  it.each([
    [SourceAccessClassification.MANUAL_ONLY, 'SOURCE_MANUAL_ONLY_NETWORK_FORBIDDEN'],
    [SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED, 'SOURCE_ROBOTS_POLICY_DECISION_REQUIRED'],
    [SourceAccessClassification.AUTHORIZED_ACCOUNT, 'SOURCE_AUTHORIZED_ACCOUNT_CAPABILITY_REQUIRED'],
    [SourceAccessClassification.DATA_AGREEMENT, 'SOURCE_DATA_AGREEMENT_APPROVAL_REQUIRED'],
  ])('rejects unsupported source access %s before connector/network/snapshot work', async (classification, code) => {
    const acquire = vi.fn();
    const supports = vi.fn(() => true); // Untrusted/custom connectors cannot bypass policy.
    const connector = { connectorId: 'official-api', connectorVersion: '2.0.0',
      category: SourceConnectorCategory.OFFICIAL_API, supports, acquire, getSignature: vi.fn(),
    } as ISourceConnector;
    const store = vi.fn();
    const configured = new ImportSourceDefinition({
      ...source, accessClassification: classification, metadata: { approved: true },
    });
    await expect(new AcquireImportSourceUseCase(
      new SourceConnectorRegistry([connector]),
      { store, get: vi.fn() } as unknown as IImportRawSnapshotStore,
    ).execute(configured)).rejects.toThrow(code);
    expect(supports).not.toHaveBeenCalled();
    expect(acquire).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
  });
  it('fails closed when connector ID is not registered', () => { expect(() => new SourceConnectorRegistry([]).resolve(source)).toThrow('SOURCE_CONNECTOR_NOT_REGISTERED'); });
  it('honors retry advice and rechecks the limiter before each attempt', async () => {
    const acquire = vi.fn().mockRejectedValueOnce(new SourceHttpError(429, 7000))
      .mockResolvedValue({ sourceId: 's1', rawBytes: new Uint8Array([1]), fetchedAt: new Date() });
    const connector = { connectorId: 'official-api', connectorVersion: '2.0.0',
      category: SourceConnectorCategory.OFFICIAL_API, supports: () => true, acquire } as ISourceConnector;
    const sleep = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);
    const store = vi.fn().mockResolvedValue({ artifactId: 'stored' });
    await new AcquireImportSourceUseCase(new SourceConnectorRegistry([connector]),
      { store } as unknown as IImportRawSnapshotStore, { wait }, sleep).execute(source);
    expect(sleep).toHaveBeenCalledWith(7000);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(store).toHaveBeenCalledOnce();
  });
  it('does not shorten long Retry-After or store a failed HTTP response', async () => {
    const acquire = vi.fn().mockRejectedValue(new SourceHttpError(503, 120000));
    const connector = { connectorId: 'official-api', connectorVersion: '2.0.0',
      category: SourceConnectorCategory.OFFICIAL_API, supports: () => true, acquire } as ISourceConnector;
    const sleep = vi.fn(); const store = vi.fn();
    await expect(new AcquireImportSourceUseCase(new SourceConnectorRegistry([connector]),
      { store } as unknown as IImportRawSnapshotStore, undefined, sleep).execute(source)).rejects.toThrow('SOURCE_HTTP_503');
    expect(acquire).toHaveBeenCalledOnce(); expect(sleep).not.toHaveBeenCalled(); expect(store).not.toHaveBeenCalled();
  });
  it('does not retry merely because an arbitrary message contains a transient code', async () => {
    const acquire = vi.fn().mockRejectedValue(new Error('SOURCE_POLICY_DENIED:SOURCE_HTTP_503'));
    const connector = { connectorId: 'official-api', connectorVersion: '2.0.0',
      category: SourceConnectorCategory.OFFICIAL_API, supports: () => true, acquire } as ISourceConnector;
    const sleep = vi.fn();
    await expect(new AcquireImportSourceUseCase(new SourceConnectorRegistry([connector]),
      {} as IImportRawSnapshotStore, undefined, sleep).execute(source)).rejects.toThrow('SOURCE_POLICY_DENIED');
    expect(acquire).toHaveBeenCalledOnce(); expect(sleep).not.toHaveBeenCalled();
  });

});
