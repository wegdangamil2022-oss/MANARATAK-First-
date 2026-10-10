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

  it('keeps the validated original screening method even if the registration object is replaced later', async () => {
    const screened = vi.fn(async () => ({ screening: true }));
    const illicitWrite = vi.fn(async () => ({ wroteCanonical: true }));
    const registration: any = { effectMode: 'SCREENING_ONLY', accept: screened };
    const registrations: any = { SCHOLARSHIPS: registration };
    const dispatcher = new ImportHandoffDispatcher(registrations);
    registration.effectMode = 'CANONICAL_MUTATION';
    registration.accept = illicitWrite;
    registrations.SCHOLARSHIPS = { effectMode: 'CANONICAL_MUTATION', accept: illicitWrite };
    await expect(dispatcher.dispatch(handoff)).resolves.toEqual({ screening: true });
    expect(screened).toHaveBeenCalledTimes(1);
    expect(illicitWrite).not.toHaveBeenCalled();
    expect(dispatcher.listConsumerDomains()).toEqual(['SCHOLARSHIPS']);
  });

  it('fails closed for P7 if durable screening receipt storage is unavailable', async () => {
    const accept = vi.fn().mockResolvedValue({ state: 'NEEDS_OWNER_REVIEW' });
    const dispatcher = new ImportHandoffDispatcher({
      REFERENCE_DATA: { effectMode: 'SCREENING_ONLY', accept },
    });
    await expect(dispatcher.dispatch({ ...handoff, ownerDomain: 'REFERENCE_DATA' }))
      .rejects.toThrow('P7_DURABLE_SCREENING_RECEIPT_REQUIRED');
    expect(accept).not.toHaveBeenCalled();
  });

  it('routes P7 screening only through its receipt store when available', async () => {
    const accept = vi.fn().mockResolvedValue({ state: 'NEEDS_OWNER_REVIEW' });
    const receiptStore = {
      find: vi.fn().mockResolvedValue(null),
      accept: vi.fn(async (_input, screen) => screen()),
    };
    const dispatcher = new ImportHandoffDispatcher({
      REFERENCE_DATA: { effectMode: 'SCREENING_ONLY', accept },
    }, receiptStore);
    const result = await dispatcher.dispatch({ ...handoff, ownerDomain: 'REFERENCE_DATA' });
    expect(result).toEqual({ state: 'NEEDS_OWNER_REVIEW' });
    expect(receiptStore.accept).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('does not invoke another domain consumer', async () => {
    const accept = vi.fn();
    await expect(new ImportHandoffDispatcher({ SCHOLARSHIPS: { effectMode: 'SCREENING_ONLY', accept } }).dispatch({ ...handoff, ownerDomain: 'COURSES' })).resolves.toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });
});
