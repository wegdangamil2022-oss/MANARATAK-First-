import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { VerifiedMajorSourceWriter } from '../../packages/infrastructure/src/majors/VerifiedMajorSourceWriter';

describe('verified major source projection', () => {
  it('rejects altered owner content before writing', async () => {
    const execute = vi.fn();
    const writer = new VerifiedMajorSourceWriter({ $executeRaw: execute } as unknown as PrismaClient,
      [{ id: 'source', payload: { canonicalMajorName: 'Source name' } }]);
    await expect(writer.insert('MajorVersion', [{ sourceId: 'source', data: { id: 'version', rawContentBlocks: { canonicalMajorName: 'Changed' } } }])).rejects.toThrow('PROJECTION_MISMATCH');
    expect(execute).not.toHaveBeenCalled();
  });
  it('copies the exact verified source server-side without retransmitting its dossier', async () => {
    const content = 'Exact source dossier '.repeat(1000), payload = { canonicalMajorName: 'Source name', contentBlocks: [{ content }] };
    const execute = vi.fn().mockResolvedValue(1);
    const writer = new VerifiedMajorSourceWriter({ $executeRaw: execute } as unknown as PrismaClient, [{ id: 'source', payload }]);
    await writer.insert('MajorVersion', [{ sourceId: 'source', data: { id: 'version', rawContentBlocks: payload } }]);
    const query = execute.mock.calls[0][0];
    expect(JSON.stringify(query.values)).not.toContain(content);
    expect(query.sql).toContain('jsonb_populate_record');
    expect(query.sql).toContain('"ImportRecord"');
    expect(query.sql).toContain("(source.\"rawPayload\"->'_phase6HandoffEnvelope'->'normalizedPayload') || (item.value->'patch')");
  });
  it('fails closed if the verified source row disappears', async () => {
    const payload = { canonicalMajorName: 'Source name' };
    const writer = new VerifiedMajorSourceWriter({ $executeRaw: vi.fn().mockResolvedValue(0) } as unknown as PrismaClient, [{ id: 'source', payload }]);
    await expect(writer.insert('MajorVersion', [{ sourceId: 'source', data: { rawContentBlocks: payload } }])).rejects.toThrow('COUNT_MISMATCH');
  });
});
