import { describe, it, expect, vi } from 'vitest';
import { CourseBulkPublicationUseCases } from '../../src/courses/use-cases/CourseBulkPublicationUseCases';
import type { CourseBulkClaim } from '@manaratak/domain';

function setup(phase: 'PREVIEWING' | 'EXECUTING' = 'PREVIEWING') {
  const claim: CourseBulkClaim = { summary: { id: 'batch', digest: 'digest', phase, createdAt: '', expiresAt: '', reason: 'Reviewed source', total: 3,
    counts: { PENDING: 3, ELIGIBLE: 0, BLOCKED: 0, SUCCESS: 0, FAILED: 0, NOT_EXECUTED: 0 } }, lease: 'lease',
    items: ['eligible', 'blocked', 'stale'].map((id, index) => ({ id, name: id, version: 4, index, state: phase === 'EXECUTING' ? 'ELIGIBLE' : 'PENDING', reasons: [] })) };
  const jobs = { claim: vi.fn().mockResolvedValue(claim), checkpoint: vi.fn(), release: vi.fn(), read: vi.fn().mockResolvedValue({ summary: claim.summary }),
    publicationReceipt: vi.fn().mockResolvedValue(false), createSnapshot: vi.fn().mockResolvedValue({ id: 'batch', replayed: false }),
    confirm: vi.fn().mockResolvedValue({ replayed: false }), cancel: vi.fn().mockResolvedValue({ replayed: false }), retrySelection: vi.fn().mockResolvedValue(['failed']) };
  const admin = { getCourse: vi.fn(async (id: string) => ({ version: id === 'stale' ? 5 : 4, status: 'READY_TO_PUBLISH' })),
    getExternalReadiness: vi.fn(async (id: string) => ({ eligible: id !== 'blocked', blockers: id === 'blocked' ? ['IMPORTED_COURSE_LINK_NOT_VERIFIED'] : [] })) };
  const imported = { publish: vi.fn() };
  const atomic = { execute: vi.fn(async (_definition, mutation) => mutation({ boundaryId: 'audited-transaction' })) };
  const service = new CourseBulkPublicationUseCases(jobs as never, admin as never, imported as never, atomic as never);
  return { service, jobs, admin, imported, atomic, claim };
}
describe('durable external publication use cases', () => {
  it('previews every frozen reference without publishing, distinguishing policy blockers and stale versions', async () => {
    const f = setup(); await f.service.step('batch', 'owner');
    expect(f.imported.publish).not.toHaveBeenCalled();
    expect(f.jobs.checkpoint.mock.calls[0][3].map((item: { state: string }) => item.state)).toEqual(['ELIGIBLE', 'BLOCKED', 'BLOCKED']);
    expect(f.jobs.release).toHaveBeenCalledWith('batch', 'owner', 'lease');
  });
  it('publishes only current eligible records through the canonical versioned command', async () => {
    const f = setup('EXECUTING'); await f.service.step('batch', 'owner');
    expect(f.imported.publish).toHaveBeenCalledExactlyOnceWith('eligible', expect.objectContaining({ actorId: 'owner', expectedVersion: 4, correlationId: 'batch', reason: 'Reviewed source' }));
    expect(f.jobs.checkpoint.mock.calls[0][3].map((item: { state: string }) => item.state)).toEqual(['SUCCESS', 'BLOCKED', 'FAILED']);
  });
  it('recovers an already committed publication only with a matching durable batch/actor receipt', async () => {
    const f = setup('EXECUTING'); f.claim.items = [f.claim.items[0]];
    f.admin.getCourse.mockResolvedValue({ version: 5, status: 'PUBLISHED' }); f.jobs.publicationReceipt.mockResolvedValue(true);
    await f.service.step('batch', 'owner');
    expect(f.jobs.publicationReceipt).toHaveBeenCalledWith('eligible', 5, 'batch', 'owner');
    expect(f.imported.publish).not.toHaveBeenCalled(); expect(f.jobs.checkpoint.mock.calls[0][3][0].state).toBe('SUCCESS');
  });
  it('reports partial service failures without exposing SQL or claiming success', async () => {
    const f = setup(); f.admin.getExternalReadiness.mockRejectedValue(Error('postgres password=private'));
    await f.service.step('batch', 'owner');
    expect(f.jobs.checkpoint.mock.calls[0][3][0]).toMatchObject({ state: 'FAILED', reasons: ['COURSE_BULK_SERVICE_UNAVAILABLE'] });
    expect(f.imported.publish).not.toHaveBeenCalled();
  });
  it('reconciles a committed publication when the subsequent detail read fails', async () => {
    const f = setup('EXECUTING'); f.claim.items = [f.claim.items[0]];
    f.imported.publish.mockRejectedValue(Error('detail reread unavailable after commit')); f.jobs.publicationReceipt.mockResolvedValue(true);
    await f.service.step('batch', 'owner');
    expect(f.jobs.checkpoint.mock.calls[0][3][0]).toMatchObject({ state: 'SUCCESS', reasons: [] });
  });
  it('does not checkpoint a guessed outcome when commit confirmation storage is unavailable', async () => {
    const f = setup('EXECUTING'); f.claim.items = [f.claim.items[0]];
    f.imported.publish.mockRejectedValue(Error('unknown response')); f.jobs.publicationReceipt.mockRejectedValue(Error('receipt unavailable'));
    await expect(f.service.step('batch', 'owner')).rejects.toThrow('receipt unavailable');
    expect(f.jobs.checkpoint).not.toHaveBeenCalled(); expect(f.jobs.release).toHaveBeenCalled();
  });
  it('releases a lease after checkpoint failure and never force retries publication', async () => {
    const f = setup('EXECUTING'); f.jobs.checkpoint.mockRejectedValue(Error('checkpoint failure'));
    await expect(f.service.step('batch', 'owner')).rejects.toThrow('checkpoint failure'); expect(f.jobs.release).toHaveBeenCalled();
  });
  it('creates audited snapshots with actor-bound idempotency and deduplicated stable IDs', async () => {
    const f = setup(); await f.service.preview({ ids: ['b', 'a', 'a'] }, 'owner', 'Explicit reason', 'idempotent-key-001');
    expect(f.jobs.createSnapshot.mock.calls[0][1]).toMatchObject({ actorId: 'owner', selection: { ids: ['a', 'b'] } });
    const first = f.jobs.createSnapshot.mock.calls[0][1].reference;
    await f.service.preview({ ids: ['b', 'a'] }, 'other-owner', 'Explicit reason', 'idempotent-key-001');
    expect(f.jobs.createSnapshot.mock.calls[1][1].reference).not.toBe(first);
    await expect(f.service.preview({ ids: ['a'] }, 'owner', 'Explicit reason', 'bad')).rejects.toThrow('IDEMPOTENCY_REQUIRED');
  });
  it('retries only failed references through a fresh mandatory preview and new versions', async () => {
    const f = setup(); await f.service.retry('batch', 'owner', 'Retry after recovery', 'retry-idempotency-001');
    expect(f.jobs.retrySelection).toHaveBeenCalledWith('batch', 'owner');
    expect(f.jobs.createSnapshot.mock.calls[0][1].selection).toEqual({ ids: ['failed'] });
    expect(f.imported.publish).not.toHaveBeenCalled();
  });
});
