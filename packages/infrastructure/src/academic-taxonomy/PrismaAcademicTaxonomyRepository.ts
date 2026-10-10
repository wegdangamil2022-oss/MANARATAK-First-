import { Prisma, PrismaClient } from '@prisma/client';
import {
  IAcademicTaxonomyRepository,
  classifyTaxonomyCrosswalk, TaxonomyCrosswalkQuery, TaxonomyCrosswalkReport, TaxonomyGovernanceSnapshot, TaxonomyRelatedNodesPage,
  type AtomicPersistenceContext,
  normalizeAcademicTaxonomyAlias,
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
  constructor(private readonly prisma: PrismaClient, private readonly bound = false) {}

  withTransaction(context: AtomicPersistenceContext): IAcademicTaxonomyRepository {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('TAXONOMY_ATOMIC_TRANSACTION_REQUIRED');
    return new PrismaAcademicTaxonomyRepository(tx as unknown as PrismaClient, true);
  }

  async executeSerializable<T>(
    operation: (repository: IAcademicTaxonomyRepository) => Promise<T>,
  ): Promise<T> {
    if (this.bound) {
      // One shared graph/alias/mapping lock spans owner writes, audit and outbox.
      await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'academic-taxonomy:governance'}, 0))`;
      return operation(this);
    }
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
            new PrismaAcademicTaxonomyRepository(transactionClient as unknown as PrismaClient, true).executeSerializable(operation),
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
    const where = this.nodeWhere(filters);

    const records = await this.prisma.academicTaxonomyNode.findMany({
      where,
      orderBy: [{ canonicalCode: 'asc' }, { id: 'asc' }],
      ...(filters?.page || filters?.pageSize ? {
        skip: (Math.max(1, filters.page ?? 1) - 1) * Math.min(100, Math.max(1, filters.pageSize ?? 50)),
        take: Math.min(100, Math.max(1, filters.pageSize ?? 50)),
      } : {}),
    });

    return records.map((r: any) => this.toNodeDto(r));
  }

  private nodeWhere(filters?: AcademicTaxonomyFilters) {
    const where: any = {};

    if (filters?.rootOnly) { where.childEdges = { none: {} }; where.OR = [{ nodeType: 'ACADEMIC_FIELD' }, { metadata: { path: ['approvedRoot'], equals: true } }]; }
    if (filters?.orphan) { where.childEdges = { none: {} }; where.NOT = { OR: [{ nodeType: 'ACADEMIC_FIELD' }, { metadata: { path: ['approvedRoot'], equals: true } }] }; }
    if (filters?.unmapped) { where.sourceMappings = { none: {} }; where.targetMappings = { none: {} }; }
    if (filters?.nodeType) {
      where.nodeType = filters.nodeType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.standardType) {
      where.standardType = filters.standardType;
    }
    if (filters?.parentNodeId) where.childEdges = filters.orphan ? { none: {}, some: { parentNodeId: filters.parentNodeId } } : { some: { parentNodeId: filters.parentNodeId } };
    if (filters?.q) {
      const normalizedQuery = this.normalizeAlias(filters.q);
      const exactStandardQuery = filters.q.trim().toUpperCase();
      const search = [
        { canonicalName: { contains: filters.q, mode: 'insensitive' } },
        { canonicalCode: { contains: filters.q, mode: 'insensitive' } },
        { standardCode: { contains: filters.q, mode: 'insensitive' } },
        { aliases: { some: { normalizedAlias: normalizedQuery } } },
        { sourceMappings: { some: { targetStandard: exactStandardQuery } } },
        { targetMappings: { some: { sourceStandard: exactStandardQuery } } },
      ];
      if (where.OR) where.AND = [...(where.AND ?? []), { OR: search }]; else where.OR = search;
    }

    return where;
  }

  async countNodes(filters?: AcademicTaxonomyFilters): Promise<number> {
    return this.prisma.academicTaxonomyNode.count({ where: this.nodeWhere(filters) });
  }

  async relatedNodesPage(nodeId: string, direction: 'parents' | 'children', filters: { page?: number; pageSize?: number; activeOnly?: boolean } = {}): Promise<TaxonomyRelatedNodesPage> {
    const page = filters.page ?? 1; const pageSize = filters.pageSize ?? 50;
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('TAXONOMY_PAGINATION_INVALID');
    const parents = direction === 'parents';
    const where = { ...(parents ? { childNodeId: nodeId } : { parentNodeId: nodeId }),
      ...(filters.activeOnly ? parents ? { parentNode: { status: 'ACTIVE' } } : { childNode: { status: 'ACTIVE' } } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.academicTaxonomyEdge.findMany({ where, orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize, include: parents ? { parentNode: true } : { childNode: true } }),
      this.prisma.academicTaxonomyEdge.count({ where }),
    ]);
    return { links: rows.map(row => ({ edgeId: row.id, nodeId: parents ? row.parentNodeId : row.childNodeId, isPrimary: row.isPrimary })), data: rows.map((row: any) => this.toNodeDto(parents ? row.parentNode : row.childNode)), total, page, pageSize, hasNextPage: page * pageSize < total };
  }

  async getGovernanceSnapshot(standardType?: AcademicStandardType): Promise<TaxonomyGovernanceSnapshot> {
    const read = async (tx: Prisma.TransactionClient): Promise<TaxonomyGovernanceSnapshot> => {
      const nodes = await tx.academicTaxonomyNode.findMany({ where: standardType ? { standardType } : {}, orderBy: { id: 'asc' }, take: 5001 });
      if (nodes.length > 5000) throw new Error('TAXONOMY_DIAGNOSTICS_SCOPE_TOO_LARGE');
      const ids = nodes.map(node => node.id);
      const [edges, aliases, mappings] = await Promise.all([
        tx.academicTaxonomyEdge.findMany({ where: { OR: [{ parentNodeId: { in: ids } }, { childNodeId: { in: ids } }] }, orderBy: { id: 'asc' }, take: 20001 }),
        tx.academicTaxonomyAlias.findMany({ where: { nodeId: { in: ids } }, orderBy: { id: 'asc' }, take: 20001 }),
        tx.academicStandardMapping.findMany({ where: { OR: [{ sourceNodeId: { in: ids } }, { targetNodeId: { in: ids } }] }, orderBy: { id: 'asc' }, take: 20001 }),
      ]);
      if ([edges.length, aliases.length, mappings.length].some(count => count > 20000)) throw new Error('TAXONOMY_DIAGNOSTICS_SCOPE_TOO_LARGE');
      const allIds = new Set([...edges.flatMap(edge => [edge.parentNodeId, edge.childNodeId]), ...mappings.flatMap(mapping => [mapping.sourceNodeId, mapping.targetNodeId])]);
      for (const id of ids) allIds.delete(id);
      if (allIds.size > 5000) throw new Error('TAXONOMY_DIAGNOSTICS_SCOPE_TOO_LARGE');
      const contextNodes = allIds.size ? await tx.academicTaxonomyNode.findMany({ where: { id: { in: [...allIds] } }, orderBy: { id: 'asc' } }) : [];
      return { nodes: nodes.map(row => this.toNodeDto(row)), contextNodes: contextNodes.map(row => this.toNodeDto(row)),
        edges: edges.map(row => this.toEdgeDto(row)), aliases: aliases.map(row => this.toAliasDto(row)), mappings: mappings.map(row => this.toMappingDto(row)), asOf: new Date().toISOString(), standardType };
    };
    // Repeatable read gives the read-only diagnostics one consistent version/asOf snapshot.
    if (this.bound) return read(this.prisma as unknown as Prisma.TransactionClient);
    return this.prisma.$transaction(read, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async crosswalkReport(query: TaxonomyCrosswalkQuery): Promise<TaxonomyCrosswalkReport> {
    const page = query.page ?? 1; const confidence = query.minConfidence ?? 0.8;
    if (query.sourceStandard === query.targetStandard || !Number.isSafeInteger(page) || page < 1 || page > 1000 || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('TAXONOMY_CROSSWALK_QUERY_INVALID');
    const status = query.status ?? AcademicTaxonomyStatus.ACTIVE;
    const offset = (page - 1) * 25;
    const conditions = [Prisma.sql`n."standardType" = ${query.sourceStandard}`, Prisma.sql`n."status" = ${status}`];
    if (query.nodeType) conditions.push(Prisma.sql`n."nodeType" = ${query.nodeType}`);
    if (query.q) conditions.push(Prisma.sql`(n."canonicalCode" ILIKE ${`%${query.q}%`} OR n."canonicalName" ILIKE ${`%${query.q}%`})`);
    const rows = await this.prisma.$queryRaw<Array<{ report: TaxonomyCrosswalkReport }>>(Prisma.sql`
      WITH report AS (
        SELECT n."id" AS "nodeId", n."canonicalCode", n."canonicalName", n."nodeType", c.candidates::int AS candidates,
          c.qualified::int AS "qualifiedTargets", c.exacts::int AS "exactTargets", CASE WHEN c.exacts > 1 THEN 'CONFLICTING' WHEN c.qualified > 1 THEN 'AMBIGUOUS'
          WHEN c.qualified = 1 THEN 'MAPPED' WHEN c.candidates > 0 THEN 'UNRESOLVED' ELSE 'UNMAPPED' END AS "mappingState"
        FROM "AcademicTaxonomyNode" n LEFT JOIN LATERAL (
          SELECT COUNT(DISTINCT m."targetNodeId") AS candidates,
            COUNT(DISTINCT m."targetNodeId") FILTER (WHERE t."status" = 'ACTIVE' AND t."standardType" = ${query.targetStandard} AND m."sourceStandard" = n."standardType" AND m."strength" IN ('EXACT','BROAD','NARROW','RELATED') AND COALESCE(m."confidence", 0) >= ${confidence}) AS qualified,
            COUNT(DISTINCT m."targetNodeId") FILTER (WHERE t."status" = 'ACTIVE' AND t."standardType" = ${query.targetStandard} AND m."sourceStandard" = n."standardType" AND m."strength" = 'EXACT' AND COALESCE(m."confidence", 0) >= ${confidence}) AS exacts
          FROM "AcademicStandardMapping" m JOIN "AcademicTaxonomyNode" t ON t."id" = m."targetNodeId"
          WHERE m."sourceNodeId" = n."id" AND m."targetStandard" = ${query.targetStandard}
        ) c ON TRUE WHERE ${Prisma.join(conditions, ' AND ')}
      ) SELECT jsonb_build_object(
        'data', COALESCE((SELECT jsonb_agg(item) FROM (SELECT * FROM report WHERE (${query.mappingState ?? null}::text IS NULL OR "mappingState" = ${query.mappingState ?? null}) ORDER BY "canonicalCode", "nodeId" LIMIT 25 OFFSET ${offset}) item), '[]'::jsonb),
        'total', (SELECT COUNT(*) FROM report WHERE (${query.mappingState ?? null}::text IS NULL OR "mappingState" = ${query.mappingState ?? null})),
        'counts', COALESCE((SELECT jsonb_object_agg("mappingState", total) FROM (SELECT "mappingState", COUNT(*) AS total FROM report GROUP BY "mappingState") facets), '{}'::jsonb),
        'page', ${page}::int, 'pageSize', 25, 'asOf', CURRENT_TIMESTAMP) AS report`);
    const result = rows[0].report;
    for (const item of result.data) if (classifyTaxonomyCrosswalk(item) !== item.mappingState) throw new Error('TAXONOMY_CROSSWALK_STATE_INCONSISTENT');
    return { ...result, counts: Object.assign({ MAPPED: 0, UNMAPPED: 0, AMBIGUOUS: 0, CONFLICTING: 0, UNRESOLVED: 0 }, result.counts) };
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

  async createNode(data: UpsertAcademicTaxonomyNodeDto): Promise<AcademicTaxonomyNodeDto> {
    const standardType = data.standardType ?? AcademicStandardType.CUSTOM_NATIONAL;
    const deterministicKey = AcademicTaxonomyDeterministicKey.create({ ...data, standardType });
    try {
      const row = await this.prisma.academicTaxonomyNode.create({ data: { deterministicKey,
        nodeType: data.nodeType, canonicalCode: data.canonicalCode, canonicalName: data.canonicalName,
        status: data.status ?? AcademicTaxonomyStatus.DRAFT, standardType,
        description: data.description, standardCode: data.standardCode,
        localizedNames: data.localizedNames as Prisma.InputJsonValue | undefined,
        metadata: data.metadata as Prisma.InputJsonValue | undefined } });
      return this.toNodeDto(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error('TAXONOMY_NODE_VERSION_CONFLICT');
      throw error;
    }
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

  async updateNode(nodeId: string, data: UpsertAcademicTaxonomyNodeDto, expectedUpdatedAt: string): Promise<AcademicTaxonomyNodeDto> {
    const revision = new Date(expectedUpdatedAt);
    if (!Number.isFinite(revision.getTime())) throw new Error('TAXONOMY_NODE_VERSION_CONFLICT');
    return this.executeSerializable(async repository => {
      const tx = repository as PrismaAcademicTaxonomyRepository;
      const current = await tx.getNode(nodeId);
      if (!current) throw new Error('TAXONOMY_NODE_NOT_FOUND');
      if (current.nodeType !== data.nodeType || current.canonicalCode !== data.canonicalCode ||
          (current.standardType ?? AcademicStandardType.CUSTOM_NATIONAL) !==
          (data.standardType ?? AcademicStandardType.CUSTOM_NATIONAL)) throw new Error('TAXONOMY_IDENTITY_IMMUTABLE');
      const won = await tx.prisma.academicTaxonomyNode.updateMany({
        where: { id: nodeId, updatedAt: revision },
        data: { updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)), canonicalName: data.canonicalName, description: data.description ?? null,
          status: data.status ?? current.status, standardCode: data.standardCode ?? null,
          localizedNames: data.localizedNames as Prisma.InputJsonValue | undefined,
          metadata: data.metadata as Prisma.InputJsonValue | undefined },
      });
      if (won.count !== 1) throw new Error('TAXONOMY_NODE_VERSION_CONFLICT');
      const updated = await tx.getNode(nodeId);
      if (!updated) throw new Error('TAXONOMY_NODE_NOT_FOUND');
      return updated;
    });
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
    // Historical spellings may predate NFC. Compare with the exact shared JS policy,
    // not database-locale LOWER(), which differs for some Unicode code points.
    const rows = await this.prisma.academicTaxonomyAlias.findMany({ orderBy: { id: 'asc' }, take: 20001 });
    if (rows.length > 20000) throw new Error('TAXONOMY_ALIAS_RECONCILIATION_SCOPE_TOO_LARGE');
    const key = normalizeAcademicTaxonomyAlias(normalizedAlias);
    return rows.filter(row => normalizeAcademicTaxonomyAlias(row.alias) === key || normalizeAcademicTaxonomyAlias(row.normalizedAlias) === key).map(row => this.toAliasDto(row));
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
        locale: data.locale?.trim().toLowerCase() || null,
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
    return normalizeAcademicTaxonomyAlias(value);
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
