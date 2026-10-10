import { taxonomyRevisionHash } from '../services/TaxonomyRevisionHash';
import { TaxonomyDiagnosticsService } from '../services/TaxonomyDiagnosticsService';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {
  IAcademicTaxonomyRepository,
  ICanonicalAcademicUsageGateway,
  AcademicLifecycleDecision,
  assertAcademicLifecycleDecision,
  AcademicStandardType,
  TaxonomyCrosswalkQuery,
  AcademicTaxonomyDeterministicKey,
  normalizeAcademicTaxonomyAlias,
  IAcademicTaxonomyValidationService,
  AcademicTaxonomyValidationService,
  AcademicTaxonomyCompletenessReport,
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
  AcademicTaxonomyValidationSeverity,
  AcademicTaxonomyValidationIssue,
  AcademicTaxonomySeedBatch,
  AcademicTaxonomyFilters,
} from '@manaratak/domain';
import {
  AcademicTaxonomyImportHandoffService,
  AcademicTaxonomyImportHandoffCommand,
} from '../services';

export class AdminAcademicTaxonomyUseCases {
  constructor(
    private readonly repository: IAcademicTaxonomyRepository,
    private readonly validationService: IAcademicTaxonomyValidationService = new AcademicTaxonomyValidationService(),
    private readonly importHandoffService: AcademicTaxonomyImportHandoffService = new AcademicTaxonomyImportHandoffService(),
    private readonly atomic?: AtomicDomainMutationCoordinator,
    private readonly usage?: ICanonicalAcademicUsageGateway
  ) {}

  public listNodes(filters?: AcademicTaxonomyFilters): Promise<AcademicTaxonomyNodeDto[]> {
    return this.repository.listNodes(filters);
  }

  public async listNodesPage(filters: AcademicTaxonomyFilters = {}) {
    const page = filters.page ?? 1; const pageSize = filters.pageSize ?? 50;
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new Error('TAXONOMY_PAGINATION_INVALID');
    if (!this.repository.countNodes) throw new Error('TAXONOMY_PAGINATION_UNAVAILABLE');
    const [data, total] = await Promise.all([this.repository.listNodes({ ...filters, page, pageSize }), this.repository.countNodes(filters)]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNextPage: page * pageSize < total };
  }

  public async relatedNodesPage(nodeId: string, direction: 'parents' | 'children', filters?: { page?: number; pageSize?: number }) {
    if (!this.repository.relatedNodesPage) throw new Error('TAXONOMY_GOVERNANCE_READ_UNAVAILABLE');
    return this.repository.relatedNodesPage(nodeId, direction, filters);
  }

  public async primaryPath(nodeId: string) {
    const path: AcademicTaxonomyNodeDto[] = []; const visited = new Set<string>();
    let current: string | undefined = nodeId;
    let alternatives: AcademicTaxonomyNodeDto[] = []; let alternativeTotal = 0;
    let termination = 'NO_PRIMARY_PARENT';
    for (let depth = 0; current && depth < 32; depth++) {
      if (visited.has(current)) throw new Error('TAXONOMY_PATH_CYCLE'); visited.add(current);
      const node = await this.repository.getNode(current); if (!node) throw new Error('TAXONOMY_NODE_NOT_FOUND');
      path.unshift(node);
      const parents = await this.relatedNodesPage(current, 'parents', { pageSize: 100 });
      // This repository contract orders primary links first and exposes actual edge flags.
      const primary = parents.links?.filter(link => link.isPrimary) ?? [];
      if (primary.length > 1) throw new Error('TAXONOMY_MULTIPLE_PRIMARY_PARENTS');
      if (depth === 0) { alternatives = parents.data.filter(parent => !primary.some(link => link.nodeId === parent.nodeId)); alternativeTotal = parents.total - primary.length; }
      current = primary[0]?.nodeId;
      if (current && depth === 31) termination = 'DEPTH_LIMIT';
    }
    return { path, alternativeParents: alternatives, alternativeTotal, termination, maxDepth: 32 };
  }

  public async diagnostics(query: { standardType?: AcademicStandardType; page?: number; code?: string }) {
    if (!this.repository.getGovernanceSnapshot) throw new Error('TAXONOMY_GOVERNANCE_READ_UNAVAILABLE');
    return new TaxonomyDiagnosticsService().report(await this.repository.getGovernanceSnapshot(query.standardType), query);
  }
  public crosswalk(query: TaxonomyCrosswalkQuery) {
    if (!this.repository.crosswalkReport) throw new Error('TAXONOMY_GOVERNANCE_READ_UNAVAILABLE');
    return this.repository.crosswalkReport(query);
  }
  public async previewMapping(data: UpsertAcademicStandardMappingDto) {
    const [sourceNode, targetNode, existingMappings] = await Promise.all([this.repository.getNode(data.sourceNodeId), this.repository.getNode(data.targetNodeId), this.repository.listMappings(data.sourceNodeId)]);
    return { sourceNode, targetNode, issues: this.validationService.validateMapping({ mapping: data, sourceNode, targetNode, existingMappings }), direction: 'SOURCE_TO_TARGET',
      meaning: data.strength === 'BROAD' ? 'TARGET_IS_BROADER' : data.strength === 'NARROW' ? 'TARGET_IS_NARROWER' : data.strength === 'EXACT' ? 'PROPOSED_EQUIVALENCE' : data.strength === 'RELATED' ? 'RELATED_WITHOUT_EQUIVALENCE' : 'UNRESOLVED_NO_EQUIVALENCE' };
  }

  public async bulkReview(input: { nodes: Array<{ nodeId: string; expectedUpdatedAt: string }>; nextStatus: 'DRAFT' | 'READY_TO_REVIEW'; reason: string;
    acknowledgeHistoricalReferences: boolean; dryRun: boolean; previewHash?: string }, context?: AtomicMutationRequestContext): Promise<any> {
    if (!input.nodes.length || input.nodes.length > 25 || new Set(input.nodes.map(node => node.nodeId)).size !== input.nodes.length || !['DRAFT', 'READY_TO_REVIEW'].includes(input.nextStatus)) throw new Error('TAXONOMY_BULK_REVIEW_INVALID');
    assertAcademicLifecycleDecision({ reason: input.reason, acknowledgeHistoricalReferences: input.acknowledgeHistoricalReferences });
    if (this.atomic && !input.dryRun) return this.mutate('TAXONOMY_BULK_REVIEWED', 'review-queue', context, owner => owner.bulkReview(input), { lifecycleReason: input.reason, requestedStatus: input.nextStatus });
    const entries = await Promise.all(input.nodes.map(async item => {
      const node = await this.repository.getNode(item.nodeId);
      const issues = !node ? ['NODE_NOT_FOUND'] : node.updatedAt.toISOString() !== item.expectedUpdatedAt ? ['VERSION_CONFLICT'] : !['DRAFT', 'READY_TO_REVIEW'].includes(node.status) ? ['STATUS_NOT_REVIEWABLE'] : this.validationService.validateNode(node).issues.filter(issue => issue.severity === 'ERROR').map(issue => issue.code);
      const impact = node ? await this.getUsage(node.nodeId) : null;
      return { ...item, node, issues, impact };
    }));
    const previewHash = taxonomyRevisionHash({ entries: entries.map(({ node, impact, ...entry }) => ({ ...entry, impact: impact ? { counts: impact.counts, totalReferences: impact.totalReferences } : null, actualVersion: node?.updatedAt.toISOString(), status: node?.status })), nextStatus: input.nextStatus, reason: input.reason.trim() });
    const preview = { previewHash, data: entries.map(({ node, ...entry }) => entry), canApply: entries.every(entry => !entry.issues.length), maxBatchSize: 25 };
    if (input.dryRun) return preview;
    if (!preview.canApply || input.previewHash !== previewHash) throw new Error('TAXONOMY_BULK_PREVIEW_CONFLICT');
    for (const entry of entries) {
      if (entry.node!.status === input.nextStatus) continue;
      await this.editNode(entry.nodeId, { ...entry.node!, status: input.nextStatus as any, lifecycle: { reason: input.reason, acknowledgeHistoricalReferences: true } }, entry.expectedUpdatedAt);
    }
    return { ...preview, applied: true };
  }

  public getNode(nodeId: string): Promise<AcademicTaxonomyNodeDto | null> {
    return this.repository.getNode(nodeId);
  }

  public listChildren(nodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    return this.repository.listChildren(nodeId);
  }

  public listParents(nodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    return this.repository.listParents(nodeId);
  }

  public listAliases(nodeId: string): Promise<AcademicTaxonomyAliasDto[]> {
    return this.repository.listAliases(nodeId);
  }

  public listMappings(nodeId: string): Promise<AcademicStandardMappingDto[]> {
    return this.repository.listMappings(nodeId);
  }

  public validateNode(
    data: UpsertAcademicTaxonomyNodeDto
  ): AcademicTaxonomyCompletenessReport {
    return this.validationService.validateNode(data);
  }

  public async upsertNode(data: UpsertAcademicTaxonomyNodeDto & { expectedUpdatedAt?: string; lifecycle?: AcademicLifecycleDecision }, context?: AtomicMutationRequestContext): Promise<{
    node: AcademicTaxonomyNodeDto;
    report: AcademicTaxonomyCompletenessReport;
  }> {
    if (this.atomic) return this.mutate('TAXONOMY_NODE_UPSERTED', AcademicTaxonomyDeterministicKey.create(data), context, cases => cases.upsertNode(data), this.lifecycleAudit(data));
    const current = await this.repository.getNodeByCanonicalKey(data);
    if (current) {
      if (!data.expectedUpdatedAt) throw new Error('TAXONOMY_NODE_VERSION_CONFLICT');
      return this.editNode(current.nodeId, data, data.expectedUpdatedAt);
    }
    const report = this.validateNode(data);
    this.assertNoErrors(report.issues, 'Node validation failed');

    if (data.status === 'ARCHIVED') throw new Error('ACADEMIC_CREATE_ARCHIVED_FORBIDDEN');
    const node = this.repository.createNode ? await this.repository.createNode(data) : await this.repository.upsertNode(data);
    return { node, report };
  }

  public async editNode(nodeId: string, data: UpsertAcademicTaxonomyNodeDto & { lifecycle?: AcademicLifecycleDecision }, expectedUpdatedAt: string, context?: AtomicMutationRequestContext): Promise<{ node: AcademicTaxonomyNodeDto; report: AcademicTaxonomyCompletenessReport }> {
    if (this.atomic) return this.mutate('TAXONOMY_NODE_CHANGED', nodeId, context, cases => cases.editNode(nodeId, data, expectedUpdatedAt), this.lifecycleAudit(data));
    const current = await this.repository.getNode(nodeId);
    if (!current) throw new Error('TAXONOMY_NODE_NOT_FOUND');
    if (data.nodeType !== current.nodeType || data.canonicalCode !== current.canonicalCode ||
        (data.standardType ?? AcademicStandardType.CUSTOM_NATIONAL) !==
        (current.standardType ?? AcademicStandardType.CUSTOM_NATIONAL)) throw new Error('TAXONOMY_IDENTITY_IMMUTABLE');
    if (!Number.isFinite(Date.parse(expectedUpdatedAt)) || current.updatedAt.toISOString() !== expectedUpdatedAt)
      throw new Error('TAXONOMY_NODE_VERSION_CONFLICT');
    if (data.status && data.status !== current.status) {
      assertAcademicLifecycleDecision(data.lifecycle);
      await this.getUsage(nodeId); // Fail closed if impact cannot be obtained; historical references remain untouched.
    }
    const report = this.validateNode(data);
    this.assertNoErrors(report.issues, 'Node validation failed');
    if (!this.repository.updateNode) throw new Error('TAXONOMY_GOVERNED_EDIT_UNAVAILABLE');
    const node = await this.repository.updateNode(nodeId, data, expectedUpdatedAt);
    return { node, report };
  }

  public async addEdge(data: UpsertAcademicTaxonomyEdgeDto, context?: AtomicMutationRequestContext): Promise<AcademicTaxonomyEdgeDto> {
    if (this.atomic) return this.mutate('TAXONOMY_HIERARCHY_CHANGED', data.childNodeId, context, cases => cases.addEdge(data));
    return this.repository.executeSerializable(async (transactionRepository) => {
      const existingNodes = await transactionRepository.listNodes();
      const existingEdges = await transactionRepository.listEdges();

      const issues = this.validationService.validateEdge({
        edge: data,
        existingNodes,
        existingEdges,
      });
      this.assertNoErrors(issues, 'Edge validation failed');

      return transactionRepository.addEdge(data);
    });
  }

  public async removeEdge(edgeId: string, context?: AtomicMutationRequestContext): Promise<void> {
    if (this.atomic) return this.mutate('TAXONOMY_EDGE_REMOVED', edgeId, context, cases => cases.removeEdge(edgeId));
    return this.repository.removeEdge(edgeId);
  }

  public async removeEdgeByNodes(parentNodeId: string, childNodeId: string, context?: AtomicMutationRequestContext): Promise<boolean> {
    if (this.atomic) return this.mutate('TAXONOMY_HIERARCHY_CHANGED', childNodeId, context, cases => cases.removeEdgeByNodes(parentNodeId, childNodeId));
    const edge = await this.repository.findEdgeByNodes(parentNodeId, childNodeId);
    if (!edge) return false;
    await this.repository.removeEdge(edge.edgeId);
    return true;
  }

  public async removeAlias(aliasId: string, context?: AtomicMutationRequestContext): Promise<void> {
    if (this.atomic) return this.mutate('TAXONOMY_ALIAS_REMOVED', aliasId, context, cases => cases.removeAlias(aliasId));
    return this.repository.removeAlias(aliasId);
  }

  public async addAlias(data: UpsertAcademicTaxonomyAliasDto, context?: AtomicMutationRequestContext): Promise<AcademicTaxonomyAliasDto> {
    if (this.atomic) return this.mutate('TAXONOMY_ALIAS_ADDED', data.nodeId, context, cases => cases.addAlias(data));
    const normalizedAlias = normalizeAcademicTaxonomyAlias(data.alias);
    const existingAliases = await this.repository.listAliasesByNormalizedAlias(normalizedAlias);

    const issues = this.validationService.validateAlias({
      alias: data,
      existingAliases,
    });
    this.assertNoErrors(issues, 'Alias validation failed');

    return this.repository.addAlias(data);
  }

  public async addMapping(
    data: UpsertAcademicStandardMappingDto, context?: AtomicMutationRequestContext
  ): Promise<AcademicStandardMappingDto> {
    if (this.atomic) return this.mutate('TAXONOMY_MAPPING_ADDED', data.sourceNodeId, context, cases => cases.addMapping(data));
    const [sourceNode, targetNode, existingMappings] = await Promise.all([
      this.repository.getNode(data.sourceNodeId),
      this.repository.getNode(data.targetNodeId),
      this.repository.listMappings(data.sourceNodeId),
    ]);

    const issues = this.validationService.validateMapping({
      mapping: data,
      existingMappings,
      sourceNode,
      targetNode,
    });
    this.assertNoErrors(issues, 'Mapping validation failed');

    return this.repository.addMapping(data);
  }

  public async removeMapping(mappingId: string, context?: AtomicMutationRequestContext): Promise<void> {
    if (this.atomic) return this.mutate('TAXONOMY_MAPPING_REMOVED', mappingId, context, cases => cases.removeMapping(mappingId));
    return this.repository.removeMapping(mappingId);
  }

  public prepareImportHandoff(
    command: AcademicTaxonomyImportHandoffCommand
  ): AcademicTaxonomySeedBatch {
    return this.importHandoffService.prepareSeedBatch(command);
  }


  public async getUsage(nodeId: string) {
    if (!this.usage) throw new Error('ACADEMIC_USAGE_UNAVAILABLE');
    return this.usage.summarize('TAXONOMY_NODE', nodeId);
  }

  private lifecycleAudit(data: UpsertAcademicTaxonomyNodeDto & { lifecycle?: AcademicLifecycleDecision }) {
    return data.lifecycle ? { lifecycleReason: data.lifecycle.reason.trim(), historicalReferencesPreserved: true, requestedStatus: data.status } : undefined;
  }

  private mutate<T>(action: string, id: string, context: AtomicMutationRequestContext | undefined,
    work: (cases: AdminAcademicTaxonomyUseCases) => Promise<T>, auditMetadata?: Record<string, unknown>): Promise<T> {
    if (!this.atomic || !context?.actorId || !this.repository.withTransaction) throw new Error('TAXONOMY_ATOMIC_CONTEXT_REQUIRED');
    return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'ACADEMIC_TAXONOMY', aggregateId: id, action, context, auditMetadata, outbox: { eventType: 'TaxonomyCatalogChanged', payload: { changedAggregateId: id, operation: action, requiresOwnerReload: true } } }, tx => {
      const repository = this.repository.withTransaction!(tx);
      return repository.executeSerializable(() => work(new AdminAcademicTaxonomyUseCases(repository, this.validationService, this.importHandoffService, undefined, this.usage?.withTransaction(tx))));
    });
  }

  private assertNoErrors(issues: AcademicTaxonomyValidationIssue[], messagePrefix: string): void {
    const errorIssues = issues.filter(
      (issue) => issue.severity === AcademicTaxonomyValidationSeverity.ERROR
    );

    if (errorIssues.length > 0) {
      const errorCodes = errorIssues.map((i) => i.code).join(', ');
      throw new Error(`${messagePrefix}: ${errorCodes}`);
    }
  }
}
