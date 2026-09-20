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
    return this.repository.listNodes({ ...filters, status: AcademicTaxonomyStatus.ACTIVE });
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
      ...filters,
      status: AcademicTaxonomyStatus.ACTIVE,
      ...(trimmed ? { q: trimmed } : {}),
    });
  }

  public async listChildren(parentNodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    const parent = await this.repository.getNode(parentNodeId);
    if (parent?.status !== AcademicTaxonomyStatus.ACTIVE) return [];
    return (await this.repository.listChildren(parentNodeId)).filter((node) => node.status === AcademicTaxonomyStatus.ACTIVE);
  }

  public async listParents(childNodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    const child = await this.repository.getNode(childNodeId);
    if (child?.status !== AcademicTaxonomyStatus.ACTIVE) return [];
    return (await this.repository.listParents(childNodeId)).filter((node) => node.status === AcademicTaxonomyStatus.ACTIVE);
  }
}
