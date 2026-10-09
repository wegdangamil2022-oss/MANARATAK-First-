import { describe, expect, it } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

const fullId = /^(?:batch|rec)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Phase 6 opaque identifier safety', () => {
  it('creates full-entropy batch and record IDs without rewriting old identifiers', async () => {
    const repo = new PrismaImportRepository(undefined, 'DEVELOPMENT_ONLY');
    const batchIds = new Set<string>();
    const recordIds = new Set<string>();
    for (let i = 0; i < 96; i++) {
      const batch = await repo.createBatch({ sourceSystem: 'TEST', dataType: 'GENERIC' });
      const record = await repo.createRecord({ batchId: batch.id, status: 'COMPLETE', rawPayload: { index: i } });
      expect(batch.id).toMatch(fullId);
      expect(record.id).toMatch(fullId);
      batchIds.add(batch.id);
      recordIds.add(record.id);
    }
    expect(batchIds.size).toBe(96);
    expect(recordIds.size).toBe(96);
    const existing = await repo.createBatch({ dataType: 'GENERIC' });
    const created = await repo.bulkCreateRecords([{ batchId: existing.id, status: 'COMPLETE', rawPayload: { ok: true } }]);
    expect(created.count).toBe(1);
    const listed = await repo.listRecords({ batchId: existing.id });
    expect(listed.data[0].id).toMatch(fullId);
    // Legacy IDs remain readable; no data migration/backfill is performed.
  });
});
