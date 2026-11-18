import { describe, expect, it } from 'vitest';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import { SourceNetworkSecurityPolicy } from '../../src/import-foundation/network/SourceNetworkSecurityPolicy';
const source = new ImportSourceDefinition({ sourceId: 'official', displayName: 'Official', baseUrl: 'https://data.example.com/catalog/', category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, status: SourceStatus.ACTIVE, connectorId: 'official-api', connectorVersion: '2.0.0', metadata: { allowedUrlScope: { allowedOrigins: ['https://data.example.com'], allowedPathPrefixes: ['/catalog/'] } } });
describe('SourceNetworkSecurityPolicy', () => {
  it('accepts only an in-scope URL when every DNS answer is public', async () => { const result = await new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34'] }).validate(source, 'https://data.example.com/catalog/a'); expect(result.addresses).toEqual(['93.184.216.34']); });
  it.each([['credentials', 'https://user:secret@data.example.com/catalog/a'], ['path', 'https://data.example.com/private/a'], ['origin', 'https://evil.example/catalog/a'], ['scheme', 'http://data.example.com/catalog/a']])('blocks %s', async (_name, url) => { await expect(new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34'] }).validate(source, url)).rejects.toThrow(); });
  it.each(['127.0.0.1', '10.0.0.1', '169.254.1.1', '192.168.1.2', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:192.168.1.1', '::ffff:169.254.1.1', '::ffff:172.16.0.1'])('blocks private/link-local address %s', async (address) => { await expect(new SourceNetworkSecurityPolicy({ resolve: async () => [address] }).validate(source, 'https://data.example.com/catalog/a')).rejects.toThrow('SOURCE_ADDRESS_BLOCKED'); });
  it('fails closed when one DNS answer is private', async () => { await expect(new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34', '127.0.0.1'] }).validate(source, 'https://data.example.com/catalog/a')).rejects.toThrow('SOURCE_ADDRESS_BLOCKED'); });
  it.each(['0:0:0:0:0:0:0:1', '64:ff9b::7f00:1', '2002:7f00:1::1'])('rejects special IPv6 DNS answer %s before fetching', async (address) => {
    const policy = new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34', address] });
    await expect(policy.validate(source, 'https://data.example.com/catalog/a')).rejects.toThrow('SOURCE_ADDRESS_BLOCKED');
  });
});

describe('SourceNetworkSecurityPolicy path boundary hardening', () => {
  it('blocks sibling-prefix escape while allowing the configured segment and descendants', async () => {
    const resolver = { resolve: async () => ['93.184.216.34'] };
    const policy = new SourceNetworkSecurityPolicy(resolver);
    await expect(policy.validate(source, 'https://data.example.com/catalog')).resolves.toBeDefined();
    await expect(policy.validate(source, 'https://data.example.com/catalog/item')).resolves.toBeDefined();
    await expect(policy.validate(source, 'https://data.example.com/catalog-evil/item')).rejects.toThrow(
      'SOURCE_PATH_OUT_OF_SCOPE',
    );
  });
  it.each([
    '/catalog/%2e%2e%2fprivate', '/catalog/%252e%252e%252fprivate',
    '/catalog/..%5cprivate', '/catalog/a/%252e%252e/private', '/catalog/%c0%afprivate',
    '/catalog/..%25%32%66private', '/catalog/%25252525252525252fprivate',
    '/catalog/..%25c0%25afprivate',
    '/catalog/..;x/private', '/catalog/%2e%2e%3bx/private', '/catalog/a/%252e%252e%253bx/private',
  ])('rejects ambiguous encoded path %s before DNS lookup', async (path) => {
    let lookups = 0;
    const policy = new SourceNetworkSecurityPolicy({ resolve: async () => { lookups++; return ['93.184.216.34']; } });
    await expect(policy.validate(source, `https://data.example.com${path}`)).rejects.toThrow('SOURCE_PATH_OUT_OF_SCOPE');
    expect(lookups).toBe(0);
  });
  it.each(['/catalog/my%20file.pdf', '/catalog/%D8%B9%D8%B1%D8%A8%D9%8A', '/catalog/file%2Epdf', '/catalog/100%25', '/catalog/item;lang=ar/file'])
    ('preserves ordinary encoded path %s', async path => {
      await expect(new SourceNetworkSecurityPolicy({ resolve: async () => ['93.184.216.34'] })
        .validate(source, `https://data.example.com${path}`)).resolves.toBeDefined();
    });
});
