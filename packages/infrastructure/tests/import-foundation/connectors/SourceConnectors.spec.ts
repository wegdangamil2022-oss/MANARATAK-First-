import { describe, it, expect } from 'vitest';
import { ImportSourceDefinition, SourceConnectorCategory, SourceAccessClassification, SourceStatus } from '@manaratak/domain';
import type { ISafeSourceHttpTransport } from '@manaratak/application';
import { OfficialApiSourceConnector, OfficialFeedSourceConnector, SitemapSourceConnector, StaticHtmlSourceConnector, ManualUploadSourceConnector } from '../../../src';
const transport: ISafeSourceHttpTransport = { async get(_source, request) { return { requestedUrl: request.targetUrl!, finalUrl: request.targetUrl!, statusCode: 200, contentType: 'application/octet-stream', rawBytes: new TextEncoder().encode('safe-offline-fixture'), fetchedAt: new Date('2026-08-23T00:00:00Z') }; } };
const operational = [new OfficialApiSourceConnector(transport), new OfficialFeedSourceConnector(transport), new SitemapSourceConnector(transport), new StaticHtmlSourceConnector(transport)];
function source(category: SourceConnectorCategory, connectorId: string, connectorVersion: string) { return new ImportSourceDefinition({ sourceId: 'test-source', displayName: 'Test', baseUrl: 'https://example.com/data', category, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, status: SourceStatus.ACTIVE, connectorId, connectorVersion }); }
describe('operational source connectors', () => {
  for (const connector of operational) it(`${connector.connectorId} acquires raw bytes through injected transport`, async () => {
    const configured = source(connector.category, connector.connectorId, connector.connectorVersion); expect(connector.supports(configured)).toBe(true);
    const result = await connector.acquire(configured); expect(new TextDecoder().decode(result.rawBytes)).toBe('safe-offline-fixture'); expect((await connector.getSignature(configured)).expectedSchemaShape).toEqual({ type: 'raw-source-bytes', category: connector.category });
  });
  it('manual upload never uses network acquisition', async () => {
    const connector = new ManualUploadSourceConnector(); const configured = source(connector.category, connector.connectorId, connector.connectorVersion);
    await expect(connector.acquire(configured, { targetUrl: 'https://example.com' })).rejects.toThrow('MANUAL_SOURCE_NETWORK_URL_FORBIDDEN');
    const result = await connector.acquire(configured, { manualInput: { rawBytes: new Uint8Array([1, 2]), fileName: 'safe.bin' } }); expect(result.contentLength).toBe(2);
  });
  it('manual upload rejects a disabled source even when invoked directly', async () => {
    const connector = new ManualUploadSourceConnector(); const active = source(connector.category, connector.connectorId, connector.connectorVersion); const disabled = new ImportSourceDefinition({ ...active, status: SourceStatus.DISABLED });
    await expect(connector.acquire(disabled, { manualInput: { rawBytes: new Uint8Array([1]) } })).rejects.toThrow('SOURCE_CONNECTOR_UNSUPPORTED');
  });
});
