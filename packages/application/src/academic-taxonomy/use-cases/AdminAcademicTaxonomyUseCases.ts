import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {
  IAcademicTaxonomyRepository,
  ICanonicalAcademicUsageGateway,
  AcademicLifecycleDecision,
  assertAcademicLifecycleDecision,
  AcademicStandardType,
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
    return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'ACADEMIC_TAXONOMY', aggregateId: id, action, context, auditMetadata }, tx => {
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
