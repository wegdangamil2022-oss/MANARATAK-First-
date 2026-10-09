import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ASSET_REFERENCE_OWNER_GUARDS, assertAssetReferenceIntegrityInstalled } from '../../src/asset-platform/AssetReferenceIntegrityReadiness';

function installed() {
  return [{ tableName: 'AssetRecord', triggerName: 'eap_asset_reference_lifecycle', enabled: 'O', type: 27,
    functionName: 'manaratak_protect_asset_references', argumentsHex: '', columns: [], replicationRole: 'origin' },
    { tableName: 'AssetRecord', triggerName: 'eap_asset_restore_barrier', enabled: 'O', type: 27,
      functionName: 'manaratak_protect_pending_asset_restore', argumentsHex: '', columns: [], replicationRole: 'origin' },
    { tableName: 'AssetRecord', triggerName: 'eap_asset_archive_barrier', enabled: 'O', type: 27,
      functionName: 'manaratak_protect_pending_asset_archive', argumentsHex: '', columns: [], replicationRole: 'origin' },
    ...ASSET_REFERENCE_OWNER_GUARDS.map(owner => ({
      tableName: owner.table, triggerName: 'eap_asset_reference_owner', enabled: 'O', type: 23,
      functionName: 'manaratak_require_active_asset_reference',
      argumentsHex: Buffer.from([owner.fields.join(','), String(owner.attachments), String(owner.seo), ''].join('\0')).toString('hex'),
      columns: [...owner.fields, ...(owner.attachments ? ['attachmentAssetIds'] : []), ...(owner.seo ? ['seoMetadata'] : [])].sort(),
      replicationRole: 'origin',
    }))];
}
const client = (rows: unknown[]) => ({ $queryRaw: vi.fn(async () => rows) }) as any;
describe('EAP reference guards read-only runtime deployment gate', () => {
  it('accepts the complete enabled owner/lifecycle guard set without a write', async () => {
    const prisma = client(installed());
    await expect(assertAssetReferenceIntegrityInstalled(prisma)).resolves.toBeUndefined();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it.each([
    { enabled: 'D' }, { type: 21 }, { functionName: 'wrong_guard' },
    { argumentsHex: '00' }, { columns: [] }, { replicationRole: 'replica' },
  ])('rejects disabled, misconfigured or bypassed owner guards', async change => {
    const rows = installed(); rows[3] = { ...rows[3], ...change };
    await expect(assertAssetReferenceIntegrityInstalled(client(rows))).rejects.toThrow('ASSET_REFERENCE_INTEGRITY_NOT_INSTALLED');
  });
  it('rejects absent owner or lifecycle guards', async () => {
    for (const rows of [[], installed().slice(1), installed().slice(0, -1), installed().filter(row => row.triggerName !== 'eap_asset_archive_barrier'), installed().filter(row => row.triggerName !== 'eap_asset_restore_barrier')]) {
      await expect(assertAssetReferenceIntegrityInstalled(client(rows))).rejects.toThrow('NOT_INSTALLED');
    }
  });
  it('matches every canonical direct/JSON reference and migration owner trigger', () => {
    const gateway = readFileSync(new URL('../../src/asset-platform/PrismaAssetUsageRegistryGateway.ts', import.meta.url), 'utf8');
    const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
    const migration = readFileSync(new URL('../../prisma/migrations/20261009010000_eap_asset_reference_serialization/migration.sql', import.meta.url), 'utf8');
    const direct = [...gateway.matchAll(/delegate: '(\w+)', field: '(\w+)', consumer:/g)].map(match => `${match[1]}.${match[2]}`).sort();
    const actual = ASSET_REFERENCE_OWNER_GUARDS.flatMap(owner => owner.fields.map(field => `${owner.table[0].toLowerCase()}${owner.table.slice(1)}.${field}`)).sort();
    expect(actual).toEqual(direct);
    expect(ASSET_REFERENCE_OWNER_GUARDS.filter(owner => owner.seo).map(owner => owner.table)).toEqual(['CmsContentNode', 'CmsLocalizedContent', 'CmsPublishedContent']);
    expect(ASSET_REFERENCE_OWNER_GUARDS.filter(owner => owner.attachments).map(owner => owner.table)).toEqual(['CmsPublishedContent']);
    for (const owner of ASSET_REFERENCE_OWNER_GUARDS) {
      expect(schema).toContain(`model ${owner.table} {`);
      expect(migration).toContain(`ON "${owner.table}"`);
      for (const field of owner.fields) expect(migration).toContain(`FROM %I."${owner.table}" WHERE "${field}" = $1`);
      expect(migration).toContain(`'${owner.fields.join(',')}', '${owner.attachments}', '${owner.seo}'`);
    }
    expect(migration).toContain('FOR SHARE');
    expect(migration).toContain("current_setting('transaction_isolation') <> 'read committed'");
  });
});
