import { taxonomyRevisionHash as hash } from '../services/TaxonomyRevisionHash';
import { normalizeAcademicTaxonomyAlias, AcademicTaxonomyValidationService, IAcademicTaxonomyRepository, UpsertAcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyEdgeDto, UpsertAcademicTaxonomyAliasDto, UpsertAcademicStandardMappingDto } from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AcademicImportReview, IAcademicTaxonomyImportGateway } from '../services/IAcademicTaxonomyImportGateway';
import { AcademicImportRecord, parseAcademicImportRecord } from '../services/AcademicTaxonomyScreeningConsumer';
import { AdminAcademicTaxonomyUseCases } from './AdminAcademicTaxonomyUseCases';
export class AcademicTaxonomyOwnerImportUseCases {
  private readonly validation = new AcademicTaxonomyValidationService();
  constructor(private readonly repository: IAcademicTaxonomyRepository, private readonly gateway: IAcademicTaxonomyImportGateway,
    private readonly atomic: AtomicDomainMutationCoordinator) {}
  list(page: number, status?: AcademicImportReview['status']) { return this.gateway.list(page, status); }
  screenings(page: number) { return this.gateway.listScreenings(page); }
  get(id: string) { return this.gateway.get(id); }
  private context(context: AtomicMutationRequestContext) { if (!context.actorId?.trim()) throw new Error('TAXONOMY_IMPORT_ACTOR_REQUIRED'); }
  private async inspect(record: AcademicImportRecord, repository: IAcademicTaxonomyRepository) {
    const payload = record.payload as any;
    const nodeVersions: Record<string, string> = {};
    const capture = async (id: string) => { const node = await repository.getNode(id); if (node) nodeVersions[id] = node.updatedAt.toISOString(); return node; };
    let issues: Array<{ code: string; severity: string; message: string }> = [];
    if (record.recordType === 'NODE') {
      const current = await repository.getNodeByCanonicalKey(payload);
      if (current) nodeVersions[current.nodeId] = current.updatedAt.toISOString();
      issues = this.validation.validateNode({ ...payload, status: current?.status ?? 'DRAFT' }).issues;
      if (current && (current.canonicalCode !== payload.canonicalCode || current.nodeType !== payload.nodeType || current.standardType !== payload.standardType)) issues.push({ code: 'IMMUTABLE_IDENTITY_MISMATCH', severity: 'ERROR', message: 'Import must preserve the exact stored identity spelling.' });
    } else if (record.recordType === 'EDGE') {
      const [nodes, edges] = await Promise.all([repository.listNodes(), repository.listEdges()]);
      for (const id of [payload.parentNodeId, payload.childNodeId]) { const node = nodes.find(item => item.nodeId === id); if (node) nodeVersions[id] = node.updatedAt.toISOString(); }
      issues = this.validation.validateEdge({ edge: payload, existingNodes: nodes, existingEdges: edges });
    } else if (record.recordType === 'ALIAS') {
      if (!await capture(payload.nodeId)) issues.push({ code: 'NODE_NOT_FOUND', severity: 'ERROR', message: 'Alias target does not exist.' });
      issues.push(...this.validation.validateAlias({ alias: payload, existingAliases: await repository.listAliasesByNormalizedAlias(normalizeAcademicTaxonomyAlias(payload.alias)) }));
    } else {
      const [source, target, mappings] = await Promise.all([capture(payload.sourceNodeId), capture(payload.targetNodeId), repository.listMappings(payload.sourceNodeId)]);
      issues = this.validation.validateMapping({ mapping: payload, existingMappings: mappings, sourceNode: source, targetNode: target });
    }
    return { issues, nodeVersions };
  }
  async preview(receiptId: string, context: AtomicMutationRequestContext) {
    this.context(context);
    const id = `tax-import-${hash(receiptId)}`;
    return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'TaxonomyImportReview', aggregateId: id, action: 'TAXONOMY_IMPORT_PREVIEWED', context }, async tx => {
      const gateway = this.gateway.withTransaction(tx); await gateway.lock(id);
      const prior = await gateway.get(id); if (prior) return { value: prior, replayed: true };
      const receipt = await gateway.screening(receiptId);
      const screened = receipt?.result as any;
      if (!receipt || screened?.schemaVersion !== 1 || screened?.owner !== 'ACADEMIC_TAXONOMY' || screened?.state !== 'NEEDS_OWNER_REVIEW') throw new Error('TAXONOMY_IMPORT_SCREENING_REQUIRED');
      if (screened.dryRun) throw new Error('TAXONOMY_IMPORT_DRY_RUN_NOT_APPLICABLE');
      const record = parseAcademicImportRecord(screened.record);
      const repository = this.repository.withTransaction?.(tx); if (!repository) throw new Error('TAXONOMY_ATOMIC_CONTEXT_REQUIRED');
      return repository.executeSerializable(async () => {
        const preview = await this.inspect(record, repository);
        const plan: AcademicImportReview = { id, receiptId, sourceHash: receipt.requestHash, record, preview, previewHash: hash({ record, preview }), status: 'PREVIEWED', version: 1 };
        await gateway.create(plan); return { value: plan, replayed: false };
      });
    }, result => !result.replayed).then(result => result.value);
  }
  async refresh(id: string, expectedVersion: number, context: AtomicMutationRequestContext) {
    this.context(context);
    return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'TaxonomyImportReview', aggregateId: id, action: 'TAXONOMY_IMPORT_PREVIEW_REFRESHED', context }, async tx => {
      const gateway = this.gateway.withTransaction(tx); await gateway.lock(id); const plan = await gateway.get(id);
      if (!plan || plan.version !== expectedVersion || plan.status === 'APPLIED') throw new Error('TAXONOMY_IMPORT_REVIEW_CONFLICT');
      const receipt = await gateway.screening(plan.receiptId); if (!receipt || receipt.requestHash !== plan.sourceHash) throw new Error('TAXONOMY_IMPORT_SOURCE_CONFLICT');
      const repository = this.repository.withTransaction?.(tx); if (!repository) throw new Error('TAXONOMY_ATOMIC_CONTEXT_REQUIRED');
      return repository.executeSerializable(async () => {
        const preview = await this.inspect(plan.record, repository);
        const next: AcademicImportReview = { ...plan, preview, previewHash: hash({ record: plan.record, preview }), status: 'PREVIEWED', version: plan.version + 1, reviewedBy: undefined, reason: undefined };
        await gateway.save(next, plan.version); return next;
      });
    });
  }
  async review(id: string, input: { expectedVersion: number; previewHash: string; decision: 'APPROVE' | 'REJECT'; reason: string }, context: AtomicMutationRequestContext) {
    this.context(context);
    if (!input.reason.trim() || input.reason.length > 1000) throw new Error('TAXONOMY_IMPORT_REVIEW_REASON_REQUIRED');
    return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'TaxonomyImportReview', aggregateId: id, action: 'TAXONOMY_IMPORT_REVIEWED', context, auditMetadata: { reason: input.reason, decision: input.decision } }, async tx => {
      const gateway = this.gateway.withTransaction(tx); await gateway.lock(id); const plan = await gateway.get(id);
      if (!plan || plan.version !== input.expectedVersion || plan.previewHash !== input.previewHash || plan.status !== 'PREVIEWED') throw new Error('TAXONOMY_IMPORT_REVIEW_CONFLICT');
      if (input.decision === 'APPROVE' && plan.preview.issues.some(issue => issue.severity === 'ERROR')) throw new Error('TAXONOMY_IMPORT_INVALID_PREVIEW');
      const next: AcademicImportReview = { ...plan, status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', version: plan.version + 1, reviewedBy: context.actorId, reason: input.reason.trim() };
      await gateway.save(next, plan.version); return next;
    });
  }
  async apply(id: string, input: { expectedVersion: number; previewHash: string }, context: AtomicMutationRequestContext) {
    this.context(context);
    return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'TaxonomyImportReview', aggregateId: id,
      action: 'TAXONOMY_IMPORT_APPLIED', context, outbox: { eventType: 'TaxonomyCatalogChanged', payload: { importReviewId: id, requiresOwnerReload: true } } }, async tx => {
      const gateway = this.gateway.withTransaction(tx); await gateway.lock(id); const plan = await gateway.get(id);
      if (!plan || plan.previewHash !== input.previewHash) throw new Error('TAXONOMY_IMPORT_REVIEW_CONFLICT');
      if (plan.status === 'APPLIED') return { value: plan.result, replayed: true };
      if (plan.version !== input.expectedVersion || plan.status !== 'APPROVED' || !plan.reviewedBy) throw new Error('TAXONOMY_IMPORT_APPROVAL_REQUIRED');
      const receipt = await gateway.screening(plan.receiptId);
      if (!receipt || receipt.requestHash !== plan.sourceHash) throw new Error('TAXONOMY_IMPORT_SOURCE_CONFLICT');
      const repository = this.repository.withTransaction?.(tx); if (!repository) throw new Error('TAXONOMY_ATOMIC_CONTEXT_REQUIRED');
      return repository.executeSerializable(async () => {
        const preview = await this.inspect(plan.record, repository);
        if (hash({ record: plan.record, preview }) !== plan.previewHash || preview.issues.some(issue => issue.severity === 'ERROR')) throw new Error('TAXONOMY_IMPORT_STALE_PREVIEW');
        const owner = new AdminAcademicTaxonomyUseCases(repository);
        const data = plan.record.payload as any;
        let result: unknown;
        if (plan.record.recordType === 'NODE') {
          const current = await repository.getNodeByCanonicalKey(data);
          result = current ? await owner.editNode(current.nodeId, { ...data, status: current.status } as UpsertAcademicTaxonomyNodeDto, current.updatedAt.toISOString())
            : await owner.upsertNode({ ...data, status: 'DRAFT' } as UpsertAcademicTaxonomyNodeDto);
        } else if (plan.record.recordType === 'EDGE') result = await owner.addEdge(data as UpsertAcademicTaxonomyEdgeDto);
        else if (plan.record.recordType === 'ALIAS') result = await owner.addAlias(data as UpsertAcademicTaxonomyAliasDto);
        else result = await owner.addMapping(data as UpsertAcademicStandardMappingDto);
        await gateway.save({ ...plan, status: 'APPLIED', version: plan.version + 1, result }, plan.version);
        return { value: result, replayed: false };
      });
    }, result => !result.replayed).then(result => result.value);
  }
}
