import { describe, expect, it, vi } from 'vitest';
import { ImportHandoffDispatcher } from '../../src/import-foundation/services/ImportHandoffDispatcher';

const handoff = { handoffId: 'h-1', ownerDomain: 'SCHOLARSHIPS', artifact: { sourceId: 'source', artifactId: 'artifact', rawArtifactReference: 'raw' }, normalizedPayload: { scholarshipName: 'Example' }, provenance: { sourceSystem: 'source', acquiredAt: new Date(), sourceRowNumber: 4, contentHash: 'hash' }, validation: { state: 'VALID' as const, issues: [] }, execution: { executionId: 'run', dryRun: false, attempt: 1, idempotencyKey: 'key' }, correlationId: 'corr' };

describe('ImportHandoffDispatcher', () => {
  it('dispatches by owner domain and preserves the handoff unchanged', async () => {
    const accept = vi.fn().mockResolvedValue({ canonicalScreening: [] });
    const dispatcher = new ImportHandoffDispatcher({ SCHOLARSHIPS: { effectMode: 'SCREENING_ONLY', accept } });
    await expect(dispatcher.dispatch(handoff)).resolves.toEqual({ canonicalScreening: [] });
    expect(accept).toHaveBeenCalledWith(handoff);
  });
  it('rejects undeclared or canonical-mutating consumers at registration before any side effect', () => {
    const accept = vi.fn(async () => ({ createdCanonicalId: 'must-not-happen' }));
    expect(() => new ImportHandoffDispatcher({
      SCHOLARSHIPS: { accept } as any,
    })).toThrow('IMPORT_OWNER_TRANSACTIONAL_RECEIPT_REQUIRED:SCHOLARSHIPS');
    expect(() => new ImportHandoffDispatcher({
      SCHOLARSHIPS: { effectMode: 'CANONICAL_MUTATION', accept },
    })).toThrow('IMPORT_OWNER_TRANSACTIONAL_RECEIPT_REQUIRED:SCHOLARSHIPS');
    expect(accept).not.toHaveBeenCalled();
  });

  it('rejects an advertised screening consumer without an accept method', () => {
    expect(() => new ImportHandoffDispatcher({
      SCHOLARSHIPS: { effectMode: 'SCREENING_ONLY' } as any,
    })).toThrow('IMPORT_HANDOFF_CONSUMER_INVALID:SCHOLARSHIPS');
  });

  it('does not invoke another domain consumer', async () => {
    const accept = vi.fn();
    await expect(new ImportHandoffDispatcher({ SCHOLARSHIPS: { effectMode: 'SCREENING_ONLY', accept } }).dispatch({ ...handoff, ownerDomain: 'COURSES' })).resolves.toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });
});
