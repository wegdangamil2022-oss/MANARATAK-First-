import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { AssetId } from '@absheer/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaAssetRecordRepository } from '../../../packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository';
import { PrismaAssetUsageRegistryGateway } from '../../../packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway';
import { disposableClient } from './disposable';
const db = disposableClient();
const prefix = 'review03-' + randomUUID();
describe('03 synthetic asset library volume on disposable PostgreSQL', () => {
  beforeAll(() => db.$connect());
  afterAll(async () => { await db.assetRecord.deleteMany({ where: { ownerId: prefix } }); await db.$disconnect(); });
  it('keeps q across cursor pages over 10000 assets and bounds canonical usage lookup', async () => {
    const started = performance.now();
    await db.$executeRaw`
      INSERT INTO "AssetRecord" (id, reference, "ownerId", "ownerType", "lifecycleState", "securityClassification", "retentionCategory", metadata, "createdAt", "updatedAt")
      SELECT ${prefix} || '-asset-' || lpad(i::text, 6, '0'), ${prefix} || '-reference-' || i::text,
        ${prefix}, 'STUDENT', 'QUARANTINED', 'INTERNAL', 'PERMANENT',
        jsonb_build_object('originalFilename', CASE WHEN i % 2 = 0 THEN 'needle.pdf' ELSE 'other.pdf' END, 'fileExtension', 'pdf', 'mimeType', 'application/pdf', 'byteSize', 64),
        TIMESTAMP '2026-01-01' + (i / 5) * interval '1 second', now()
      FROM generate_series(1, 10000) AS i`;
    await db.$executeRawUnsafe('ANALYZE "AssetRecord"');
    const repository = new PrismaAssetRecordRepository(db);
    const ids = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    const queryStarted = performance.now();
    do {
      const page = await repository.queryAdmin({ q: 'needle', ownerId: prefix, limit: 100, cursor });
      expect(page.items.length).toBeLessThanOrEqual(100);
      for (const item of page.items) { expect(ids.has(item.id)).toBe(false); expect(item.metadata.originalFilename).toBe('needle.pdf'); ids.add(item.id); }
      pages++; expect(pages).toBeLessThanOrEqual(51);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(ids.size).toBe(5000);
    const usage = new PrismaAssetUsageRegistryGateway(db);
    const batch = [...ids].slice(0, 100);
    const usageStarted = performance.now();
    for (const id of batch.slice(0, 3)) expect(await usage.findUsages(new AssetId(id))).toEqual([]);
    const plans = await db.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM "AssetRecord"
      WHERE "ownerId" = ${prefix} ORDER BY "createdAt" DESC, id DESC LIMIT 101`;
    const metrics = { scope: 'SYNTHETIC_ASSET_VOLUME_NOT_PROVIDER_ACCEPTANCE', inserted: 10000, matched: ids.size, pages, queryMs: performance.now() - queryStarted, sampleUsageMs: performance.now() - usageStarted, totalMs: performance.now() - started, plans };
    console.log(JSON.stringify(metrics));
    if (process.env.SECTION123_EVIDENCE_DIR) await writeFile(process.env.SECTION123_EVIDENCE_DIR + '/section03-volume.json', JSON.stringify(metrics, null, 2) + '\n');
  });
});
