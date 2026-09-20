import { Prisma, PrismaClient } from '@prisma/client';
import {
  IAcademicTaxonomyRepository,
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
  AcademicTaxonomyFilters,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyDeterministicKey,
} from '@manaratak/domain';

export class PrismaAcademicTaxonomyRepository implements IAcademicTaxonomyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async executeSerializable<T>(
    operation: (repository: IAcademicTaxonomyRepository) => Promise<T>,
  ): Promise<T> {
    // The API's explicit in-memory development adapter is intentionally not a
    // real Prisma client and cannot provide database isolation. Keep it usable
    // for source/dev flows while production-like Prisma paths always execute
    // the graph check + mutation inside SERIALIZABLE isolation.
    if (typeof (this.prisma as unknown as { $transaction?: unknown }).$transaction !== 'function') {
      return operation(this);
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transactionClient) =>
            operation(new PrismaAcademicTaxonomyRepository(transactionClient as unknown as PrismaClient)),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt === maxAttempts) throw error;
      }
    }
    throw new Error('ACADEMIC_TAXONOMY_SERIALIZABLE_TRANSACTION_EXHAUSTED');
  }

  async listNodes(filters?: AcademicTaxonomyFilters): Promise<AcademicTaxonomyNodeDto[]> {
    const where: any = {};

    if (filters?.nodeType) {
      where.nodeType = filters.nodeType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.standardType) {
      where.standardType = filters.standardType;
    }
    if (filters?.q) {
      const normalizedQuery = this.normalizeAlias(filters.q);
      const exactStandardQuery = filters.q.trim().toUpperCase();
      where.OR = [
        { canonicalName: { contains: filters.q, mode: 'insensitive' } },
        { canonicalCode: { contains: filters.q, mode: 'insensitive' } },
        { standardCode: { contains: filters.q, mode: 'insensitive' } },
        { aliases: { some: { normalizedAlias: normalizedQuery } } },
        { sourceMappings: { some: { targetStandard: exactStandardQuery } } },
        { targetMappings: { some: { sourceStandard: exactStandardQuery } } },
      ];
    }

    const records = await this.prisma.academicTaxonomyNode.findMany({
      where,
      orderBy: { canonicalCode: 'asc' },
      ...(filters?.page || filters?.pageSize ? {
        skip: (Math.max(1, filters.page ?? 1) - 1) * Math.min(100, Math.max(1, filters.pageSize ?? 50)),
        take: Math.min(100, Math.max(1, filters.pageSize ?? 50)),
      } : {}),
    });

    return records.map((r: any) => this.toNodeDto(r));
  }

  async getNode(nodeId: string): Promise<AcademicTaxonomyNodeDto | null> {
    const record = await this.prisma.academicTaxonomyNode.findUnique({
      where: { id: nodeId },
    });

    return record ? this.toNodeDto(record) : null;
  }

  async getNodeByCanonicalKey(input: {
    nodeType: AcademicTaxonomyNodeType;
    canonicalCode: string;
    standardType?: AcademicStandardType;
  }): Promise<AcademicTaxonomyNodeDto | null> {
    const standardType = input.standardType ?? AcademicStandardType.CUSTOM_NATIONAL;
    const deterministicKey = AcademicTaxonomyDeterministicKey.create({
      nodeType: input.nodeType,
      canonicalCode: input.canonicalCode,
      standardType,
    });

    const record = await this.prisma.academicTaxonomyNode.findUnique({
      where: { deterministicKey },
    });

    return record ? this.toNodeDto(record) : null;
  }

  async upsertNode(data: UpsertAcademicTaxonomyNodeDto): Promise<AcademicTaxonomyNodeDto> {
    const standardType = data.standardType ?? AcademicStandardType.CUSTOM_NATIONAL;
    const status = data.status ?? AcademicTaxonomyStatus.DRAFT;
    const deterministicKey = AcademicTaxonomyDeterministicKey.create({
      nodeType: data.nodeType,
      canonicalCode: data.canonicalCode,
      standardType,
    });

    const record = await this.prisma.academicTaxonomyNode.upsert({
      where: { deterministicKey },
      update: {
        canonicalName: data.canonicalName,
        description: data.description ?? null,
        status,
        standardType,
        standardCode: data.standardCode ?? null,
        localizedNames: data.localizedNames ? (data.localizedNames as any) : undefined,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
      create: {
        deterministicKey,
        nodeType: data.nodeType,
        canonicalCode: data.canonicalCode,
        canonicalName: data.canonicalName,
        description: data.description ?? null,
        status,
        standardType,
        standardCode: data.standardCode ?? null,
        localizedNames: data.localizedNames ? (data.localizedNames as any) : undefined,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    });

    return this.toNodeDto(record);
  }

  // --- Hierarchy Methods (P8E-2) ---
  async listEdges(): Promise<AcademicTaxonomyEdgeDto[]> {
    const edges = await this.prisma.academicTaxonomyEdge.findMany();
    return edges.map((edge: any) => this.toEdgeDto(edge));
  }

  async findEdgeByNodes(parentNodeId: string, childNodeId: string): Promise<AcademicTaxonomyEdgeDto | null> {
    const edge = await this.prisma.academicTaxonomyEdge.findFirst({
      where: { parentNodeId, childNodeId }
    });
    return edge ? this.toEdgeDto(edge) : null;
  }

  async listChildren(parentNodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    const edges = await this.prisma.academicTaxonomyEdge.findMany({
      where: { parentNodeId },
      include: { childNode: true },
    });

    return edges.map((edge: any) => this.toNodeDto(edge.childNode));
  }

  async listParents(childNodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
    const edges = await this.prisma.academicTaxonomyEdge.findMany({
      where: { childNodeId },
      include: { parentNode: true },
    });

    return edges.map((edge: any) => this.toNodeDto(edge.parentNode));
  }

  async addEdge(data: UpsertAcademicTaxonomyEdgeDto): Promise<AcademicTaxonomyEdgeDto> {
    const record = await this.prisma.academicTaxonomyEdge.create({
      data: {
        parentNodeId: data.parentNodeId,
        childNodeId: data.childNodeId,
        isPrimary: data.isPrimary ?? false,
      },
    });

    return this.toEdgeDto(record);
  }

  async removeEdge(edgeId: string): Promise<void> {
    await this.prisma.academicTaxonomyEdge.delete({
      where: { id: edgeId },
    });
  }

  // --- Alias Methods (P8E-2) ---
  async listAliases(nodeId: string): Promise<AcademicTaxonomyAliasDto[]> {
    const records = await this.prisma.academicTaxonomyAlias.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => this.toAliasDto(r));
  }

  async listAliasesByNormalizedAlias(normalizedAlias: string): Promise<AcademicTaxonomyAliasDto[]> {
    const records = await this.prisma.academicTaxonomyAlias.findMany({
      where: { normalizedAlias: this.normalizeAlias(normalizedAlias) },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => this.toAliasDto(r));
  }

  async removeAlias(aliasId: string): Promise<void> {
    await this.prisma.academicTaxonomyAlias.delete({
      where: { id: aliasId },
    });
  }

  async addAlias(data: UpsertAcademicTaxonomyAliasDto): Promise<AcademicTaxonomyAliasDto> {
    const normalizedAlias = this.normalizeAlias(data.alias);

    const record = await this.prisma.academicTaxonomyAlias.create({
      data: {
        nodeId: data.nodeId,
        locale: data.locale ?? null,
        alias: data.alias,
        normalizedAlias,
      },
    });

    return this.toAliasDto(record);
  }

  // --- Mapping Methods (P8E-2) ---
  async listMappings(nodeId: string): Promise<AcademicStandardMappingDto[]> {
    const records = await this.prisma.academicStandardMapping.findMany({
      where: {
        OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => this.toMappingDto(r));
  }

  async removeMapping(mappingId: string): Promise<void> {
    await this.prisma.academicStandardMapping.delete({
      where: { id: mappingId },
    });
  }

  async addMapping(data: UpsertAcademicStandardMappingDto): Promise<AcademicStandardMappingDto> {
    const record = await this.prisma.academicStandardMapping.create({
      data: {
        sourceNodeId: data.sourceNodeId,
        targetNodeId: data.targetNodeId,
        sourceStandard: data.sourceStandard,
        targetStandard: data.targetStandard,
        strength: data.strength,
        confidence: data.confidence ?? null,
        notes: data.notes ?? null,
      },
    });

    return this.toMappingDto(record);
  }

  private toEdgeDto(record: any): AcademicTaxonomyEdgeDto {
    return {
      edgeId: record.id,
      parentNodeId: record.parentNodeId,
      childNodeId: record.childNodeId,
      isPrimary: record.isPrimary,
      createdAt: record.createdAt,
    };
  }

  private normalizeAlias(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private toAliasDto(record: any): AcademicTaxonomyAliasDto {
    return {
      aliasId: record.id,
      nodeId: record.nodeId,
      locale: record.locale ?? undefined,
      alias: record.alias,
      normalizedAlias: record.normalizedAlias,
      createdAt: record.createdAt,
    };
  }

  private toMappingDto(record: any): AcademicStandardMappingDto {
    return {
      mappingId: record.id,
      sourceNodeId: record.sourceNodeId,
      targetNodeId: record.targetNodeId,
      sourceStandard: record.sourceStandard,
      targetStandard: record.targetStandard,
      strength: record.strength,
      confidence: record.confidence ?? undefined,
      notes: record.notes ?? undefined,
      createdAt: record.createdAt,
    };
  }

  private toNodeDto(record: any): AcademicTaxonomyNodeDto {
    return {
      nodeId: record.id,
      nodeType: record.nodeType as AcademicTaxonomyNodeType,
      canonicalCode: record.canonicalCode,
      canonicalName: record.canonicalName,
      description: record.description ?? undefined,
      status: record.status as AcademicTaxonomyStatus,
      standardType: record.standardType as AcademicStandardType,
      standardCode: record.standardCode ?? undefined,
      localizedNames: record.localizedNames ? (record.localizedNames as Record<string, string>) : undefined,
      metadata: record.metadata ? (record.metadata as Record<string, unknown>) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
