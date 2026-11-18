import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import { NodeSafeSourceHttpTransport, type IPinnedSourceRequestExecutor, type PinnedSourceRequest } from '../../src/import-foundation/network/NodeSafeSourceHttpTransport';
import { SignedSourceAccessAuthority } from '../../src/import-foundation/network/SignedSourceAccessAuthority';
import { SourceNetworkSecurityPolicy } from '../../src/import-foundation/network/SourceNetworkSecurityPolicy';

const revision = new Date('2026-10-09T00:00:00.000Z');
const source = new ImportSourceDefinition({
  sourceId: 'fixture', displayName: 'Fixture', baseUrl: 'https://example.org/data/',
  category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED,
  status: SourceStatus.ACTIVE, connectorId: 'api', connectorVersion: '1', updatedAt: revision,
  robotsPolicyUrl: 'https://example.org/robots.txt',
  metadata: { allowedUrlScope: { allowedOrigins: ['https://example.org'], allowedPathPrefixes: ['/data'] } },
});
const pair = generateKeyPairSync('ed25519');
const payload = Buffer.from(JSON.stringify({
  audience: 'MANARATAK_IMPORT', sourceId: 'fixture', sourceRevision: revision.toISOString(),
  classification: SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED,
  origin: 'https://example.org', pathPrefixes: ['/data'], policyReference: 'fixture',
  expiresAt: '2099-01-01T00:00:00.000Z',
})).toString('base64url');
const token = `${payload}.${sign(null, Buffer.from(payload), pair.privateKey).toString('base64url')}`;
const authority = new SignedSourceAccessAuthority(pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(), [token]);

describe('robots policy against a synthetic twice-decoding upstream', () => {
  it.each([
    ['/data/%2570rivate', '/data/private'],
    ['/data/%25%37%30rivate', '/data/private'],
    ['/data/ok?document=%2570rivate', '/data/ok?document=private'],
  ])('blocks %s before the upstream can decode it twice', async (path, decoded) => {
    expect(decodeURIComponent(decodeURIComponent(path))).toBe(decoded);
    const calls: PinnedSourceRequest[] = [];
    const executor: IPinnedSourceRequestExecutor = { execute: async request => {
      calls.push(request);
      const body = request.url.pathname === '/robots.txt' ? `User-agent: *\nDisallow: ${decoded}\n` : 'fixture';
      return { statusCode: 200, rawBytes: new TextEncoder().encode(body) };
    } };
    const transport = new NodeSafeSourceHttpTransport(
      new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34'] }), executor, authority,
    );
    await expect(transport.get(source, { targetUrl: `https://example.org${path}` })).rejects.toThrow('SOURCE_ROBOTS_AMBIGUOUS_ENCODING');
    expect(calls).toHaveLength(0);
  });
  it.each(['/data/100%25', '/data/file%20name', '/data/%D8%B9%D8%B1%D8%A8%D9%8A', '/data/ok?q=100%25'])
    ('permits ordinary encoding %s', async path => {
      const executor: IPinnedSourceRequestExecutor = { execute: async request => ({
        statusCode: 200,
        rawBytes: new TextEncoder().encode(request.url.pathname === '/robots.txt' ? 'User-agent: *\nDisallow: /data/private\n' : 'fixture'),
      }) };
      const transport = new NodeSafeSourceHttpTransport(
        new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34'] }), executor, authority,
      );
      await expect(transport.get(source, { targetUrl: `https://example.org${path}` })).resolves.toMatchObject({ statusCode: 200 });
    });
});
