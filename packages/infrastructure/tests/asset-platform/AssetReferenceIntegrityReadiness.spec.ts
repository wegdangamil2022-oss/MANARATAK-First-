import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  ASSET_REFERENCE_OWNER_GUARDS,
  assertAssetReferenceIntegrityInstalled,
} from '../../src/asset-platform/AssetReferenceIntegrityReadiness';

function installed() {
  return [
    {
      tableName: 'AssetRecord', triggerName:'eap_asset_lifecycle_student_document',enabled:'O',type:27,
      functionName:'manaratak_guard_student_document_asset_lifecycle',argumentsHex:'',columns:['id','lifecycleState'],replicationRole:'origin',
    },
    {
      tableName: 'AssetRecord',
      triggerName: 'eap_asset_lifecycle_certificate_delegation',
      enabled: 'O',
      type: 27,
      functionName: 'manaratak_guard_certificate_delegation_evidence_lifecycle',
      argumentsHex: '',
      columns: ['lifecycleState'],
      replicationRole: 'origin',
    },
    {
      tableName: 'AssetRecord',
      triggerName: 'eap_asset_reference_lifecycle',
      enabled: 'O',
      type: 27,
      functionName: 'manaratak_protect_asset_references',
      argumentsHex: '',
      columns: [],
      replicationRole: 'origin',
    },
    {
      tableName: 'AssetRecord',
      triggerName: 'eap_asset_restore_barrier',
      enabled: 'O',
      type: 27,
      functionName: 'manaratak_protect_pending_asset_restore',
      argumentsHex: '',
      columns: [],
      replicationRole: 'origin',
    },
    {
      tableName: 'AssetRecord',
      triggerName: 'eap_asset_archive_barrier',
      enabled: 'O',
      type: 27,
      functionName: 'manaratak_protect_pending_asset_archive',
      argumentsHex: '',
      columns: [],
      replicationRole: 'origin',
    },
    ...ASSET_REFERENCE_OWNER_GUARDS.map((owner) => ({
      tableName: owner.table,
      triggerName: 'eap_asset_reference_owner',
      enabled: 'O',
      type: 23,
      functionName: 'manaratak_require_active_asset_reference',
      argumentsHex: Buffer.from(
        [
          owner.fields.join(','),
          String(owner.attachments),
          String(owner.seo),
          '',
        ].join('\0'),
      ).toString('hex'),
      columns: [
        ...owner.fields,
        ...(owner.attachments ? ['attachmentAssetIds'] : []),
        ...(owner.seo ? ['seoMetadata'] : []),
      ].sort(),
      replicationRole: 'origin',
    })),
  ];
}
const client = (rows: unknown[]) =>
  ({ $queryRaw: vi.fn().mockResolvedValueOnce(rows).mockResolvedValueOnce([{installed:true}]) }) as any;
describe('EAP reference guards read-only runtime deployment gate', () => {
  it('accepts the complete enabled owner/lifecycle guard set without a write', async () => {
    const prisma = client(installed());
    await expect(
      assertAssetReferenceIntegrityInstalled(prisma),
    ).resolves.toBeUndefined();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it.each([
    { enabled: 'D' },
    { type: 21 },
    { functionName: 'wrong_guard' },
    { argumentsHex: '00' },
    { columns: [] },
    { replicationRole: 'replica' },
  ])(
    'rejects disabled, misconfigured or bypassed owner guards',
    async (change) => {
      const rows = installed();
      const ownerIndex = rows.findIndex(row => row.triggerName === 'eap_asset_reference_owner');
      rows[ownerIndex] = { ...rows[ownerIndex], ...change };
      await expect(
        assertAssetReferenceIntegrityInstalled(client(rows)),
      ).rejects.toThrow('ASSET_REFERENCE_INTEGRITY_NOT_INSTALLED');
    },
  );
  it('rejects absent owner or lifecycle guards', async () => {
    for (const rows of [
      [],
      installed().slice(1),
      installed().slice(0, -1),
      installed().filter(
        (row) => row.triggerName !== 'eap_asset_archive_barrier',
      ),
      installed().filter(
        (row) => row.triggerName !== 'eap_asset_restore_barrier',
      ),
    ]) {
      await expect(
        assertAssetReferenceIntegrityInstalled(client(rows)),
      ).rejects.toThrow('NOT_INSTALLED');
    }
  });
  it('rejects a missing or incompatible document-to-asset FK even when every trigger exists', async () => {
    const prisma = {$queryRaw:vi.fn().mockResolvedValueOnce(installed()).mockResolvedValueOnce([{installed:false}])};
    await expect(assertAssetReferenceIntegrityInstalled(prisma as never)).rejects.toThrow('NOT_INSTALLED');
  });
  it('matches every canonical direct/JSON reference and migration owner trigger', () => {
    const gateway = readFileSync(
      new URL(
        '../../src/asset-platform/PrismaAssetUsageRegistryGateway.ts',
        import.meta.url,
      ),
      'utf8',
    );
    const schema = readFileSync(
      new URL('../../prisma/schema.prisma', import.meta.url),
      'utf8',
    );
    const directory = new URL('../../prisma/migrations/', import.meta.url);
    const migration = readdirSync(directory, {withFileTypes:true}).filter(entry => entry.isDirectory())
      .map(entry => readFileSync(new URL(entry.name+'/migration.sql',directory),'utf8')).join('\n');
    const direct = [
      ...gateway.matchAll(/delegate: '(\w+)', field: '(\w+)', consumer:/g),
    ]
      .map((match) => `${match[1]}.${match[2]}`)
      .sort();
    const actual = ASSET_REFERENCE_OWNER_GUARDS.flatMap((owner) =>
      owner.fields.map(
        (field) =>
          `${owner.table[0].toLowerCase()}${owner.table.slice(1)}.${field}`,
      ),
    ).sort();
    expect(actual).toEqual(direct);
    expect(
      ASSET_REFERENCE_OWNER_GUARDS.filter((owner) => owner.seo).map(
        (owner) => owner.table,
      ),
    ).toEqual(['CmsContentNode', 'CmsLocalizedContent', 'CmsPublishedContent']);
    expect(
      ASSET_REFERENCE_OWNER_GUARDS.filter((owner) => owner.attachments).map(
        (owner) => owner.table,
      ),
    ).toEqual(['CmsPublishedContent']);
    for (const owner of ASSET_REFERENCE_OWNER_GUARDS) {
      expect(schema).toContain(`model ${owner.table} {`);
      expect(migration).toContain(`ON "${owner.table}"`);
      for (const field of owner.fields)
        expect(migration).toMatch(new RegExp(`FROM (?:%I\\.)?"${owner.table}" WHERE "${field}" = (?:\\$1|OLD\\."id")`));
      expect(migration).toMatch(new RegExp(`'${owner.fields.join(',')}'\\s*,\\s*'${owner.attachments}'\\s*,\\s*'${owner.seo}'`));
    }
    expect(migration).toContain('FOR SHARE');
    expect(migration).toContain(
      "current_setting('transaction_isolation') <> 'read committed'",
    );
  });
});
