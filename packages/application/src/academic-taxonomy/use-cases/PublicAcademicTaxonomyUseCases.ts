import {
  IAcademicTaxonomyRepository,
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyFilters,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
} from '@manaratak/domain';

export class PublicAcademicTaxonomyUseCases {
  constructor(private readonly repository: IAcademicTaxonomyRepository) {}

  public async listNodes(filters: AcademicTaxonomyFilters = {}): Promise<AcademicTaxonomyNodeDto[]> {
    return this.repository.listNodes({ ...this.bounded(filters), status: AcademicTaxonomyStatus.ACTIVE });
  }

  private bounded(filters: AcademicTaxonomyFilters): AcademicTaxonomyFilters {
    const page = filters.page ?? 1; const pageSize = filters.pageSize ?? 50;
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new Error('TAXONOMY_PAGINATION_INVALID');
    return { ...filters, page, pageSize };
  }

  public async getNode(nodeId: string): Promise<AcademicTaxonomyNodeDto | null> {
    const node = await this.repository.getNode(nodeId);
    return node?.status === AcademicTaxonomyStatus.ACTIVE ? node : null;
  }

  public async getNodeByCanonicalKey(input: {
    nodeType: AcademicTaxonomyNodeType;
    canonicalCode: string;
    standardType?: AcademicStandardType;
  }): Promise<AcademicTaxonomyNodeDto | null> {
    const node = await this.repository.getNodeByCanonicalKey(input);
    return node?.status === AcademicTaxonomyStatus.ACTIVE ? node : null;
  }

  public async searchNodes(query: string, filters: AcademicTaxonomyFilters = {}): Promise<AcademicTaxonomyNodeDto[]> {
    const trimmed = (query || '').trim();
    return this.repository.listNodes({
      ...this.bounded(filters),
      status: AcademicTaxonomyStatus.ACTIVE,
      ...(trimmed ? { q: trimmed } : {}),
    });
  }

  public async listChildren(parentNodeId: string, filters: { page?: number; pageSize?: number } = {}): Promise<AcademicTaxonomyNodeDto[]> {
    const parent = await this.repository.getNode(parentNodeId);
    if (parent?.status !== AcademicTaxonomyStatus.ACTIVE) return [];
    const bounded = this.bounded(filters);
    if (this.repository.relatedNodesPage) return (await this.repository.relatedNodesPage(parentNodeId, 'children', { page: bounded.page, pageSize: bounded.pageSize, activeOnly: true })).data;
    return (await this.repository.listChildren(parentNodeId)).filter((node) => node.status === AcademicTaxonomyStatus.ACTIVE).slice(((bounded.page ?? 1) - 1) * (bounded.pageSize ?? 50), (bounded.page ?? 1) * (bounded.pageSize ?? 50));
  }

  public async listParents(childNodeId: string, filters: { page?: number; pageSize?: number } = {}): Promise<AcademicTaxonomyNodeDto[]> {
    const child = await this.repository.getNode(childNodeId);
    if (child?.status !== AcademicTaxonomyStatus.ACTIVE) return [];
    const bounded = this.bounded(filters);
    if (this.repository.relatedNodesPage) return (await this.repository.relatedNodesPage(childNodeId, 'parents', { page: bounded.page, pageSize: bounded.pageSize, activeOnly: true })).data;
    return (await this.repository.listParents(childNodeId)).filter((node) => node.status === AcademicTaxonomyStatus.ACTIVE).slice(((bounded.page ?? 1) - 1) * (bounded.pageSize ?? 50), (bounded.page ?? 1) * (bounded.pageSize ?? 50));
  }
}
