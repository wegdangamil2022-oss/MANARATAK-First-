import { describe, expect, it, vi } from 'vitest';
import { ReferenceLifecycleState } from '@manaratak/domain';
import { ReferenceDataUseCases } from '../../src/reference-data/use-cases/ReferenceDataUseCases';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

function fixture(failure?: 'audit' | 'outbox') {
  let state = { rows: [] as any[], audit: [] as any[], outbox: [] as any[] };
  const context = { boundaryId: 'region-source-transaction' };
  const unit = { execute: async (work: any) => {
    const previous = { rows: [...state.rows], audit: [...state.audit], outbox: [...state.outbox] };
    try { return await work(context); } catch (error) { state = previous; throw error; }
  } };
  const audit = { saveInTransaction: vi.fn(async (record, ctx) => {
    expect(ctx).toBe(context);
    if (failure === 'audit') throw new Error('audit unavailable');
    state.audit.push(record);
  }) };
  const outbox = { appendInTransaction: vi.fn(async (record, ctx) => {
    expect(ctx).toBe(context);
    if (failure === 'outbox') throw new Error('outbox unavailable');
    state.outbox.push(record);
  }) };
  const repository = {
    upsertRegion: vi.fn(),
    upsertRegionInTransaction: vi.fn(async (data, actor, ctx) => {
      expect(ctx).toBe(context); expect(actor).toBe('verified-admin');
      const record = { ...data, versionNumber: 1, lifecycleState: 'ACTIVE' };
      state.rows.push(record); return record;
    }),
    transitionReferenceLifecycleInTransaction: vi.fn(async (command, ctx) => {
      expect(ctx).toBe(context); state.rows.push(command);
    }),
    getRegionById: vi.fn(), getCountry: vi.fn(), upsertCity: vi.fn(),
  };
  const executor = new AtomicAuditedOutboxMutationExecutor(unit as any, audit as any, outbox as any);
  const cases = new ReferenceDataUseCases(repository as any, undefined, undefined, executor);
  return { cases, repository, state: () => state };
}
const input = { countryIso2Code: 'YE', regionCode: 'YE-AD', name: ' Aden ', aliases: [{ alias: 'عدن', locale: 'ar' }] };
const actor = { actorId: 'verified-admin', correlationId: 'region-source-proof' };

describe('M10-07 region authoring with memory transaction adapters', () => {
  it('creates a stable ID and commits business + audit + outbox with the verified actor', async () => {
    const f = fixture(); const record = await f.cases.upsertRegion(input, actor);
    expect(record.id).toMatch(/^[0-9a-f-]{36}$/); expect(record.name).toBe('Aden');
    const state = f.state(); expect(state.rows).toHaveLength(1); expect(state.audit).toHaveLength(1); expect(state.outbox).toHaveLength(1);
    expect(state.audit[0].getActor().getActorId()).toBe(actor.actorId);
    expect(state.audit[0].getTarget().getTargetId()).toBe(record.id);
    expect(state.outbox[0].aggregate.aggregateId).toBe(record.id);
    expect(state.outbox[0].metadata.actorId).toBe(actor.actorId);
    expect(f.repository.upsertRegion).not.toHaveBeenCalled();
  });
  it.each(['audit', 'outbox'] as const)('rolls back the whole memory transaction if %s fails', async failure => {
    const f = fixture(failure);
    await expect(f.cases.upsertRegion(input, actor)).rejects.toThrow(failure + ' unavailable');
    expect(f.state()).toEqual({ rows: [], audit: [], outbox: [] });
  });
  it('records lifecycle reason, actor and expected version using the same boundary', async () => {
    const f = fixture();
    await f.cases.transitionReferenceLifecycle({ entityType: 'REGION', referenceId: 'region-1', toState: ReferenceLifecycleState.DEPRECATED, expectedVersion: 2, reason: ' replaced source ' }, actor);
    expect(f.repository.transitionReferenceLifecycleInTransaction).toHaveBeenCalledWith(expect.objectContaining({ reason: 'replaced source', actorId: actor.actorId, expectedVersion: 2 }), expect.anything());
    expect(f.state().audit[0].getAction().getValue()).toBe('REFERENCE_REGION_DEPRECATED');
    expect(f.state().outbox[0].payload.reason).toBe('replaced source');
  });
  it('fails closed without the audited executor', async () => {
    const f = fixture(); const cases = new ReferenceDataUseCases(f.repository as any);
    await expect(cases.upsertRegion(input, actor)).rejects.toThrow('TRANSACTIONAL_PERSISTENCE_REQUIRED');
    expect(f.repository.upsertRegion).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, countryIso2Code: 'ye' }, { ...input, regionCode: 'bad code' }, { ...input, name: ' ' },
    { ...input, id: 'r1' }, { ...input, expectedVersion: 1 }, { ...input, aliases: [{ alias: '---' }] },
    { ...input, aliases: [{ alias: 'Aden', locale: 'a' }] },
  ])('rejects invalid region commands before persistence: %j', async invalid => {
    const f = fixture(); await expect(f.cases.upsertRegion(invalid, actor)).rejects.toThrow();
    expect(f.repository.upsertRegionInTransaction).not.toHaveBeenCalled(); expect(f.state().audit).toHaveLength(0);
  });
  it('rejects unverified actor and lifecycle without an expected version', async () => {
    const f = fixture(); await expect(f.cases.upsertRegion(input, { actorId: '' })).rejects.toThrow('Authenticated actor');
    await expect(f.cases.transitionReferenceLifecycle({ entityType: 'REGION', referenceId: 'r1', toState: ReferenceLifecycleState.ARCHIVED, reason: 'archive requested' }, actor)).rejects.toThrow('expected version');
    expect(f.repository.transitionReferenceLifecycleInTransaction).not.toHaveBeenCalled();
  });
  it('rejects a deprecated region before a city write', async () => {
    const f = fixture();
    f.repository.getCountry.mockResolvedValue({ id: 'country-1', iso2Code: 'YE', lifecycleState: 'ACTIVE', isActive: true });
    f.repository.getRegionById.mockResolvedValue({ countryIso2Code: 'YE', lifecycleState: 'DEPRECATED' });
    await expect(f.cases.upsertCity({ countryIso2Code: 'YE', name: 'Aden', administrativeRegionId: 'r1' }, actor)).rejects.toThrow('Region not found');
    expect(f.repository.upsertCity).not.toHaveBeenCalled();
  });
});
