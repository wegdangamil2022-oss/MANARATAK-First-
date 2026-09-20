import { describe, expect, it, vi } from 'vitest';
import { IImportHandoffConsumer, UniversalImportHandoff } from '../../src';

describe('UniversalImportHandoff ownership contract', () => {
  const handoff: UniversalImportHandoff = {
    handoffId: 'handoff-1',
    ownerDomain: 'MAJORS',
    artifact: { sourceId: 'source-1', artifactId: 'artifact-1', rawArtifactReference: 'safe://artifact-1' },
    normalizedPayload: { sourceName: 'Computer Science' },
    provenance: { sourceSystem: 'catalog', acquiredAt: new Date('2026-08-12'), contentHash: 'hash-1' },
    validation: { state: 'NEEDS_REVIEW', issues: [{ code: 'CANONICAL_MAPPING_REQUIRED', message: 'Domain mapping required', severity: 'WARNING' }] },
    execution: { executionId: 'execution-1', dryRun: true, attempt: 1, idempotencyKey: 'import-1' },
    correlationId: 'correlation-1',
  };

  it('carries generic identity, provenance, validation, dry-run, and idempotency state', () => {
    expect(handoff).toMatchObject({
      ownerDomain: 'MAJORS',
      validation: { state: 'NEEDS_REVIEW' },
      execution: { dryRun: true, idempotencyKey: 'import-1' },
    });
    expect(handoff.normalizedPayload).not.toHaveProperty('mergeDecision');
    expect(handoff.normalizedPayload).not.toHaveProperty('promotionDecision');
  });

  it('delegates semantic acceptance to the owning Domain consumer', async () => {
    const consumer: IImportHandoffConsumer<{ decision: string }> = {
      accept: vi.fn(async (input) => ({ decision: input.validation.state === 'VALID' ? 'PROMOTE' : 'REVIEW' })),
    };
    await expect(consumer.accept(handoff)).resolves.toEqual({ decision: 'REVIEW' });
    expect(consumer.accept).toHaveBeenCalledWith(handoff);
  });
});
