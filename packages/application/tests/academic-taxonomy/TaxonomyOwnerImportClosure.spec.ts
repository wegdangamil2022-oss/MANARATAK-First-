import { describe, expect, it, vi } from 'vitest';
import { AcademicTaxonomyScreeningConsumer } from '../../src/academic-taxonomy/services/AcademicTaxonomyScreeningConsumer';
import { AcademicTaxonomyOwnerImportUseCases } from '../../src/academic-taxonomy/use-cases/AcademicTaxonomyOwnerImportUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
import { ImportHandoffDispatcher } from '../../src/import-foundation/services/ImportHandoffDispatcher';
import type { AcademicImportReview } from '../../src/academic-taxonomy/services/IAcademicTaxonomyImportGateway';
const payload = { nodeType: 'ACADEMIC_FIELD', canonicalCode: '06', canonicalName: 'ICT', standardType: 'ISCED', metadata: { sourceEdition: '2026', approvedRoot: true } };
const envelope = (data: any = payload): any => ({ handoffId: 'handoff', ownerDomain: 'ACADEMIC_TAXONOMY', normalizedPayload: data,
  artifact: { sourceId: 'official' }, provenance: { sourceSystem: 'official', contentHash: 'hash' }, validation: { state: 'VALID', issues: [] }, execution: { executionId: 'batch', dryRun: false, attempt: 1, idempotencyKey: 'key' } });
const actor = { actorId: 'owner-reviewer' };
function reorder(value: any): any { if (Array.isArray(value)) return value.map(reorder); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])); return value; }
async function harness() {
  const screened = await new AcademicTaxonomyScreeningConsumer().accept(envelope());
  const state = { plans: new Map<string, AcademicImportReview>(), nodes: [] as any[], audits: [] as any[], events: [] as any[] };
  const revision = '2026-10-10T01:00:00.000Z'; let failOutbox = false;
  const repo: any = { withTransaction: () => repo, executeSerializable: async (work: any) => work(repo),
    getNodeByCanonicalKey: vi.fn(async () => state.nodes[0] ?? null),
    createNode: vi.fn(async (data: any) => { const node = { ...data, nodeId: 'canonical-node', createdAt: new Date(revision), updatedAt: new Date(revision) }; state.nodes.push(node); return node; }),
    upsertNode: vi.fn(), getNode: vi.fn(async (id: string) => state.nodes.find(node => node.nodeId === id) ?? null),
    updateNode: vi.fn(async (_id: string, data: any) => ({ ...state.nodes[0], ...data })) };
  const gateway: any = { withTransaction: () => gateway, lock: vi.fn(async () => {}), screening: vi.fn(async () => ({ id: 'receipt', requestHash: 'screen-hash', result: screened })),
    get: vi.fn(async (id: string) => state.plans.get(id) ?? null),
    create: vi.fn(async (plan: AcademicImportReview) => { state.plans.set(plan.id, reorder(JSON.parse(JSON.stringify(plan)))); }),
    save: vi.fn(async (plan: AcademicImportReview, version: number) => { if (state.plans.get(plan.id)?.version !== version) throw new Error('TAXONOMY_IMPORT_REVIEW_CONFLICT'); state.plans.set(plan.id, reorder(JSON.parse(JSON.stringify(plan)))); }) };
  const unit = { execute: async (work: any) => {
    const before = { plans: new Map(state.plans), nodes: [...state.nodes], audits: [...state.audits], events: [...state.events] };
    try { return await work({ boundaryId: 'same-transaction' }); } catch (error) { Object.assign(state, before); throw error; }
  } };
  const audit = { saveInTransaction: async (record: any) => { state.audits.push(record); } };
  const outbox = { appendInTransaction: async (event: any) => { if (failOutbox) throw new Error('EVENT_APPEND_FAILED'); state.events.push(event); } };
  const cases = new AcademicTaxonomyOwnerImportUseCases(repo, gateway, new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(unit as any, audit as any, outbox as any)));
  return { state, repo, gateway, cases, setFailOutbox: () => { failOutbox = true; } };
}
async function approve(h: Awaited<ReturnType<typeof harness>>) {
  const plan = await h.cases.preview('receipt', actor);
  return h.cases.review(plan.id, { expectedVersion: plan.version, previewHash: plan.previewHash, decision: 'APPROVE', reason: 'Reviewed official source' }, actor);
}
describe('P6 screening and P8 owner apply closure', () => {
  it('registers a pure taxonomy screen in the actual dispatcher contract without admitting canonical writes', async () => {
    const dispatcher = new ImportHandoffDispatcher({ ACADEMIC_TAXONOMY: new AcademicTaxonomyScreeningConsumer() });
    const result = await dispatcher.dispatch(envelope()) as any;
    expect(result.state).toBe('NEEDS_OWNER_REVIEW'); expect(result.record.payload.canonicalCode).toBe('06');
    expect(() => new ImportHandoffDispatcher({ ACADEMIC_TAXONOMY: { effectMode: 'CANONICAL_MUTATION', accept: async () => null } })).toThrow('IMPORT_OWNER_TRANSACTIONAL_RECEIPT_REQUIRED');
  });
  it('refuses publication status, foreign owner fields and nested forbidden payloads at screening', async () => {
    const consumer = new AcademicTaxonomyScreeningConsumer();
    for (const data of [{ ...payload, status: 'ACTIVE' }, { ...payload, universityId: 'foreign' }, { ...payload, metadata: { nested: { rawPayload: 'private' } } }]) {
      expect((await consumer.accept(envelope(data))).state).toBe('INVALID');
    }
  });
  it('propagates upstream invalidity instead of silently approving a valid-looking payload', async () => {
    const handoff = envelope(); handoff.validation.state = 'INVALID';
    expect((await new AcademicTaxonomyScreeningConsumer().accept(handoff)).state).toBe('INVALID');
  });
  it('creates an owner preview without canonical writes and returns its receipt idempotently', async () => {
    const h = await harness(); const first = await h.cases.preview('receipt', actor); const second = await h.cases.preview('receipt', actor);
    expect(second.id).toBe(first.id); expect(h.state.nodes).toEqual([]); expect(h.state.audits).toHaveLength(1); expect(h.state.events).toHaveLength(1);
  });
  it('blocks apply before explicit review', async () => {
    const h = await harness(); const plan = await h.cases.preview('receipt', actor);
    await expect(h.cases.apply(plan.id, { expectedVersion: plan.version, previewHash: plan.previewHash }, actor)).rejects.toThrow('TAXONOMY_IMPORT_APPROVAL_REQUIRED');
    expect(h.repo.createNode).not.toHaveBeenCalled();
  });
  it('applies only a draft, survives JSONB key reordering and emits one owner apply event across replays', async () => {
    const h = await harness(); const plan = await approve(h);
    const input = { expectedVersion: plan.version, previewHash: plan.previewHash };
    const first = await h.cases.apply(plan.id, input, actor); const second = await h.cases.apply(plan.id, input, actor);
    expect(second).toEqual(JSON.parse(JSON.stringify(first))); expect(h.state.nodes[0].status).toBe('DRAFT');
    expect(h.repo.createNode).toHaveBeenCalledOnce(); expect(h.repo.upsertNode).not.toHaveBeenCalled();
    expect(h.state.events.filter(event => event.eventType === 'TaxonomyCatalogChanged')).toHaveLength(1);
    expect(h.state.plans.get(plan.id)?.status).toBe('APPLIED');
  });
  it('rolls back business, review receipt and audit if the owner event fails', async () => {
    const h = await harness(); const plan = await approve(h); const audits = h.state.audits.length; h.setFailOutbox();
    await expect(h.cases.apply(plan.id, { expectedVersion: plan.version, previewHash: plan.previewHash }, actor)).rejects.toThrow('EVENT_APPEND_FAILED');
    expect(h.state.nodes).toEqual([]); expect(h.state.plans.get(plan.id)?.status).toBe('APPROVED'); expect(h.state.audits).toHaveLength(audits);
  });
  it('blocks changed canonical data and requires a new preview/review', async () => {
    const h = await harness(); const plan = await approve(h);
    h.state.nodes.push({ ...payload, nodeId: 'other', status: 'ACTIVE', updatedAt: new Date('2026-10-10T02:00:00.000Z') });
    await expect(h.cases.apply(plan.id, { expectedVersion: plan.version, previewHash: plan.previewHash }, actor)).rejects.toThrow('TAXONOMY_IMPORT_STALE_PREVIEW');
    const refreshed = await h.cases.refresh(plan.id, plan.version, actor);
    expect(refreshed.status).toBe('PREVIEWED'); expect(refreshed.previewHash).not.toBe(plan.previewHash); expect(refreshed.reviewedBy).toBeUndefined();
    expect(h.repo.createNode).not.toHaveBeenCalled();
  });
  it('rejects stale reviewer versions and source substitution', async () => {
    const h = await harness(); const plan = await approve(h);
    await expect(h.cases.review(plan.id, { expectedVersion: 1, previewHash: plan.previewHash, decision: 'APPROVE', reason: 'stale' }, actor)).rejects.toThrow('TAXONOMY_IMPORT_REVIEW_CONFLICT');
    h.gateway.screening.mockResolvedValue({ requestHash: 'changed', result: {} });
    await expect(h.cases.apply(plan.id, { expectedVersion: plan.version, previewHash: plan.previewHash }, actor)).rejects.toThrow('TAXONOMY_IMPORT_SOURCE_CONFLICT');
  });
  it('never promotes dry-run screening receipts', async () => {
    const h = await harness(); const dry = envelope(); dry.execution.dryRun = true;
    h.gateway.screening.mockResolvedValue({ requestHash: 'dry', result: await new AcademicTaxonomyScreeningConsumer().accept(dry) });
    await expect(h.cases.preview('dry-receipt', actor)).rejects.toThrow('TAXONOMY_IMPORT_DRY_RUN_NOT_APPLICABLE');
  });
});
