import {
  IAcademicTaxonomyRepository,
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
    private readonly importHandoffService: AcademicTaxonomyImportHandoffService = new AcademicTaxonomyImportHandoffService()
  ) {}

  public listNodes(filters?: AcademicTaxonomyFilters): Promise<AcademicTaxonomyNodeDto[]> {
    return this.repository.listNodes(filters);
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

  public async upsertNode(data: UpsertAcademicTaxonomyNodeDto): Promise<{
    node: AcademicTaxonomyNodeDto;
    report: AcademicTaxonomyCompletenessReport;
  }> {
    const report = this.validateNode(data);
    this.assertNoErrors(report.issues, 'Node validation failed');

    const node = await this.repository.upsertNode(data);
    return { node, report };
  }

  public async addEdge(data: UpsertAcademicTaxonomyEdgeDto): Promise<AcademicTaxonomyEdgeDto> {
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

  public async removeEdge(edgeId: string): Promise<void> {
    return this.repository.removeEdge(edgeId);
  }

  public async removeEdgeByNodes(parentNodeId: string, childNodeId: string): Promise<boolean> {
    const edge = await this.repository.findEdgeByNodes(parentNodeId, childNodeId);
    if (!edge) return false;
    await this.repository.removeEdge(edge.edgeId);
    return true;
  }

  public async removeAlias(aliasId: string): Promise<void> {
    return this.repository.removeAlias(aliasId);
  }

  public async addAlias(data: UpsertAcademicTaxonomyAliasDto): Promise<AcademicTaxonomyAliasDto> {
    const normalizedAlias = data.alias.trim().toLowerCase().replace(/\s+/g, ' ');
    const existingAliases = await this.repository.listAliasesByNormalizedAlias(normalizedAlias);

    const issues = this.validationService.validateAlias({
      alias: data,
      existingAliases,
    });
    this.assertNoErrors(issues, 'Alias validation failed');

    return this.repository.addAlias(data);
  }

  public async addMapping(
    data: UpsertAcademicStandardMappingDto
  ): Promise<AcademicStandardMappingDto> {
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

  public async removeMapping(mappingId: string): Promise<void> {
    return this.repository.removeMapping(mappingId);
  }

  public prepareImportHandoff(
    command: AcademicTaxonomyImportHandoffCommand
  ): AcademicTaxonomySeedBatch {
    return this.importHandoffService.prepareSeedBatch(command);
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
