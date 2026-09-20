/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma transaction delegates are generated from the source-only Phase 18 migration. */
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  IStudentToolRegistryRepository,
  StudentToolDefinition,
  StudentToolExecutionRecord,
  StudentToolExecutionStatus,
  StudentToolFilters,
  StudentToolTelemetry,
  StudentToolPublicAccessPolicy,
  StudentToolTransientResultWrite,
  StudentToolVersionSnapshot,
} from '@manaratak/domain';
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
type Db = Record<string, any>;

export class PrismaStudentToolRegistryRepository implements IStudentToolRegistryRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private get db(): any {
    return this.prisma as any;
  }
  async list(filters: StudentToolFilters = {}) {
    const search = filters.search?.trim();
    const rows = await this.db.studentToolDefinitionRecord.findMany({
      where: {
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.visibility ? { visibility: filters.visibility } : {}),
        ...(filters.implementationStatus
          ? { implementationStatus: filters.implementationStatus }
          : {}),
        ...(filters.lifecycle ? { lifecycle: filters.lifecycle } : {}),
        ...(filters.executionType ? { executionType: filters.executionType } : {}),
        ...(search
          ? {
              OR: [
                { nameAr: { contains: search, mode: 'insensitive' } },
                { nameEn: { contains: search, mode: 'insensitive' } },
                { toolKey: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { versions: { orderBy: { releaseDate: 'desc' } }, dependencies: true },
      orderBy: [{ launchOrder: 'asc' }, { nameAr: 'asc' }],
    });
    return rows.map(mapDefinition);
  }
  async listPublic(filters: StudentToolFilters = {}) {
    const rows = await this.db.studentToolDefinitionRecord.findMany({
      where: {
        implementationStatus: 'IMPLEMENTED',
        lifecycle: 'ACTIVE',
        visibility: 'ACTIVE',
        availability: { path: ['publicEnabled'], equals: true },
        ...(filters.category ? { category: filters.category } : {}),
      },
      include: { versions: { orderBy: { releaseDate: 'desc' } }, dependencies: true },
      orderBy: [{ launchOrder: 'asc' }],
    });
    return rows.map(mapDefinition).filter(StudentToolPublicAccessPolicy.isDiscoverable);
  }
  async findByKey(toolKey: string) {
    const row = await this.db.studentToolDefinitionRecord.findUnique({
      where: { toolKey },
      include: { versions: { orderBy: { releaseDate: 'desc' } }, dependencies: true },
    });
    return row ? mapDefinition(row) : null;
  }
  async upsertDefinition(
    definition: StudentToolDefinition,
    actorReferenceId: string,
  ): Promise<StudentToolDefinition> {
    return this.db.$transaction(async (tx: Db) => {
      const current = await tx.studentToolDefinitionRecord.findUnique({
        where: { toolKey: definition.toolKey },
        include: { versions: true, dependencies: true },
      });
      const snapshot = versionSnapshot(definition);
      const snapshotHash = hashSnapshot(snapshot);
      const existingVersion = current
        ? await tx.studentToolVersionRecord.findUnique({
            where: {
              definitionId_semanticVersion: {
                definitionId: current.id,
                semanticVersion: definition.currentVersion.semanticVersion,
              },
            },
          })
        : null;
      if (
        existingVersion &&
        stableStringify(comparableSnapshot(existingVersion.definitionSnapshot)) !== stableStringify(snapshot)
      )
        throw new Error('IMMUTABLE_TOOL_VERSION');

      const data = definitionData(definition);
      const row = current
        ? await tx.studentToolDefinitionRecord.update({ where: { id: current.id }, data })
        : await tx.studentToolDefinitionRecord.create({ data });

      if (!existingVersion) {
        if (definition.currentVersion.status === 'ACTIVE')
          await tx.studentToolVersionRecord.updateMany({
            where: { definitionId: row.id, status: 'ACTIVE' },
            data: { status: 'RETIRED' },
          });
        await tx.studentToolVersionRecord.create({
          data: { definitionId: row.id, ...versionData(definition, snapshot, snapshotHash) },
        });
      } else if (
        existingVersion.inputSchemaVersion !== definition.currentVersion.inputSchemaVersion ||
        existingVersion.outputSchemaVersion !== definition.currentVersion.outputSchemaVersion ||
        existingVersion.changeNote !== definition.currentVersion.changeNote
      ) {
        throw new Error('IMMUTABLE_TOOL_VERSION');
      }

      await tx.studentToolDependencyRecord.deleteMany({ where: { definitionId: row.id } });
      if (definition.dependencies.length)
        await tx.studentToolDependencyRecord.createMany({
          data: definition.dependencies.map((item) => ({ definitionId: row.id, ...item })),
        });
      await appendMutation(
        tx,
        definition.toolKey,
        actorReferenceId,
        'STUDENT_TOOL_DEFINITION_UPSERTED',
        { semanticVersion: definition.currentVersion.semanticVersion, snapshotHash },
      );
      const saved = await tx.studentToolDefinitionRecord.findUnique({
        where: { id: row.id },
        include: { versions: { orderBy: { releaseDate: 'desc' } }, dependencies: true },
      });
      return mapDefinition(saved);
    });
  }
  async updateDefinition(
    toolKey: string,
    patch: Partial<StudentToolDefinition>,
    actorReferenceId: string,
    action: string,
  ): Promise<StudentToolDefinition> {
    return this.db.$transaction(async (tx: Db) => {
      const current = await tx.studentToolDefinitionRecord.findUnique({ where: { toolKey } });
      if (!current) throw new Error('TOOL_NOT_FOUND');
      const versionedFields = ['availability', 'rateLimitPolicy', 'aiCapabilityKey', 'executionType', 'outputType', 'supportedLocales', 'inputSchema', 'outputSchema', 'dependencies'];
      if (versionedFields.some((field) => patch[field as keyof StudentToolDefinition] !== undefined))
        throw new Error('TOOL_VERSION_INCREMENT_REQUIRED');
      const allowed: Record<string, unknown> = {};
      for (const key of [
        'nameAr',
        'nameEn',
        'descriptionAr',
        'descriptionEn',
        'category',
        'visibility',
        'implementationStatus',
        'lifecycle',
        'availability',
        'featureFlags',
        'rateLimitPolicy',
        'aiCapabilityKey',
        'estimatedMinutes',
        'tags',
        'iconAssetId',
        'launchOrder',
        'inputSchema',
        'outputSchema',
      ] as const)
        if (patch[key] !== undefined)
          allowed[key] = [
            'availability',
            'featureFlags',
            'rateLimitPolicy',
            'tags',
            'inputSchema',
            'outputSchema',
          ].includes(key)
            ? json(patch[key])
            : patch[key];
      await tx.studentToolDefinitionRecord.update({ where: { toolKey }, data: allowed });
      await appendMutation(tx, toolKey, actorReferenceId, action, {
        changedFields: Object.keys(allowed),
      });
      const saved = await tx.studentToolDefinitionRecord.findUnique({
        where: { toolKey },
        include: { versions: { orderBy: { releaseDate: 'desc' } }, dependencies: true },
      });
      return mapDefinition(saved);
    });
  }
  async recordExecution(record: StudentToolExecutionRecord) {
    const result = await this.recordExecutionOrReplay(record);
    if (!result.created) throw new Error('TOOL_EXECUTION_IDEMPOTENCY_CONFLICT');
    return result.record;
  }

  async recordExecutionOrReplay(record: StudentToolExecutionRecord) {
    const definition = await this.db.studentToolDefinitionRecord.findUnique({
      where: { toolKey: record.toolKey },
      select: { id: true },
    });
    if (!definition) throw new Error('TOOL_NOT_FOUND');
    const version = await this.db.studentToolVersionRecord.findUnique({
      where: {
        definitionId_semanticVersion: {
          definitionId: definition.id,
          semanticVersion: record.toolVersion,
        },
      },
      select: { id: true },
    });
    if (!version) throw new Error('TOOL_VERSION_NOT_FOUND');
    try {
      const row = await this.db.$transaction(async (tx: Db) => {
        const created = await tx.studentToolExecutionRecord.create({
          data: { ...executionData(record), definitionId: definition.id, versionId: version.id } as any,
        });
        await appendExecutionEvent(tx, 'STUDENT_TOOL_EXECUTION_STARTED', record.toolKey, record);
        return created;
      });
      return { record: mapExecution(row, record.toolKey), created: true };
    } catch (error) {
      if (!record.idempotencyKeyHash || !isUniqueConflict(error)) throw error;
      const winner = await this.db.studentToolExecutionRecord.findFirst({
        where: { definitionId: definition.id, idempotencyKeyHash: record.idempotencyKeyHash },
        include: { definition: { select: { toolKey: true } } },
      });
      if (!winner) throw error;
      return { record: mapExecution(winner, record.toolKey), created: false };
    }
  }

  async completeExecution(
    executionId: string,
    patch: Partial<StudentToolExecutionRecord>,
    transientResult?: StudentToolTransientResultWrite,
  ) {
    const row = await this.db.$transaction(async (tx: Db) => {
      const current = await tx.studentToolExecutionRecord.findUnique({
        where: { executionId },
        include: { definition: { select: { toolKey: true } } },
      });
      if (!current) throw new Error('TOOL_EXECUTION_NOT_FOUND');
      const updated = await tx.studentToolExecutionRecord.update({
        where: { executionId },
        data: {
          ...executionData(patch),
          ...(transientResult
            ? {
                resultDigest: transientResult.resultDigest,
                resultCiphertext: transientResult.protectedResult.ciphertext,
                resultIv: transientResult.protectedResult.iv,
                resultAuthTag: transientResult.protectedResult.authTag,
                resultKeyVersion: transientResult.protectedResult.keyVersion,
                resultExpiresAt: transientResult.resultExpiresAt,
              }
            : {}),
        },
      });
      await appendExecutionEvent(
        tx,
        patch.status === StudentToolExecutionStatus.COMPLETED
          ? 'STUDENT_TOOL_EXECUTION_COMPLETED'
          : 'STUDENT_TOOL_EXECUTION_FAILED',
        current.definition.toolKey,
        { ...patch, executionId } as StudentToolExecutionRecord,
      );
      return updated;
    });
    const definition = await this.db.studentToolDefinitionRecord.findUnique({
      where: { id: row.definitionId },
      select: { toolKey: true },
    });
    if (!definition) throw new Error('TOOL_NOT_FOUND');
    return mapExecution(row, definition.toolKey);
  }

  async loadTransientResult(executionId: string) {
    const row = await this.db.studentToolExecutionRecord.findUnique({
      where: { executionId },
      select: {
        resultDigest: true,
        resultCiphertext: true,
        resultIv: true,
        resultAuthTag: true,
        resultKeyVersion: true,
        resultExpiresAt: true,
      },
    });
    if (!row?.resultDigest || !row.resultCiphertext || !row.resultIv || !row.resultAuthTag || !row.resultKeyVersion || !row.resultExpiresAt)
      return null;
    if (new Date(row.resultExpiresAt).getTime() <= Date.now()) {
      await this.clearTransientResult(executionId);
      return null;
    }
    return {
      resultDigest: row.resultDigest,
      resultExpiresAt: row.resultExpiresAt,
      protectedResult: {
        ciphertext: row.resultCiphertext,
        iv: row.resultIv,
        authTag: row.resultAuthTag,
        keyVersion: row.resultKeyVersion,
      },
    };
  }

  async pruneExpiredTransientResults(now = new Date()) {
    const result = await this.db.studentToolExecutionRecord.updateMany({
      where: { resultExpiresAt: { lte: now }, resultCiphertext: { not: null } },
      data: {
        resultCiphertext: null,
        resultIv: null,
        resultAuthTag: null,
        resultKeyVersion: null,
        resultExpiresAt: null,
      },
    });
    return Number(result.count ?? 0);
  }

  private async clearTransientResult(executionId: string) {
    await this.db.studentToolExecutionRecord.update({
      where: { executionId },
      data: {
        resultCiphertext: null,
        resultIv: null,
        resultAuthTag: null,
        resultKeyVersion: null,
        resultExpiresAt: null,
      },
    });
  }

  async findExecution(executionId: string) {
    const row = await this.db.studentToolExecutionRecord.findUnique({
      where: { executionId },
      include: { definition: { select: { toolKey: true } } },
    });
    return row ? mapExecution(row, row.definition.toolKey) : null;
  }

  async findExecutionByIdempotency(toolKey: string, idempotencyKeyHash: string) {
    const row = await this.db.studentToolExecutionRecord.findFirst({
      where: { idempotencyKeyHash, definition: { toolKey } },
      include: { definition: { select: { toolKey: true } } },
    });
    return row ? mapExecution(row, row.definition.toolKey) : null;
  }

  async listExecutions(toolKey: string, page = 1, pageSize = 25) {
    const safePage = Math.max(1, page);
    const take = Math.min(100, Math.max(1, pageSize));
    const where = { definition: { toolKey } };
    const [rows, total] = await Promise.all([
      this.db.studentToolExecutionRecord.findMany({
        where,
        include: { definition: { select: { toolKey: true } } },
        orderBy: { startedAt: 'desc' },
        skip: (safePage - 1) * take,
        take,
      }),
      this.db.studentToolExecutionRecord.count({ where }),
    ]);
    return { data: rows.map((row: any) => mapExecution(row, row.definition.toolKey)), total };
  }
  async telemetry(toolKey?: string): Promise<StudentToolTelemetry> {
    const since30 = new Date(Date.now() - 30 * 86400000);
    const where = { startedAt: { gte: since30 }, ...(toolKey ? { definition: { toolKey } } : {}) };
    const rows = await this.db.studentToolExecutionRecord.findMany({
      where,
      select: { status: true, durationMs: true, startedAt: true, errorCode: true },
    });
    const now = Date.now();
    const complete = rows.filter(
      (row: any) => row.status === StudentToolExecutionStatus.COMPLETED,
    ).length;
    const failed = rows.filter(
      (row: any) => row.status === StudentToolExecutionStatus.FAILED,
    ).length;
    const durations = rows
      .map((row: any) => row.durationMs)
      .filter((value: unknown): value is number => typeof value === 'number')
      .sort((a: number, b: number) => a - b);
    return {
      executions24h: rows.filter((row: any) => now - new Date(row.startedAt).getTime() <= 86400000)
        .length,
      executions7d: rows.filter(
        (row: any) => now - new Date(row.startedAt).getTime() <= 7 * 86400000,
      ).length,
      executions30d: rows.length,
      successRate: rows.length ? complete / rows.length : null,
      failureRate: rows.length ? failed / rows.length : null,
      p95LatencyMs: durations.length
        ? durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)]
        : null,
      blocked: rows.filter((row: any) => row.status === StudentToolExecutionStatus.BLOCKED).length,
      dependencyFailures: rows.filter((row: any) =>
        String(row.errorCode ?? '').includes('DEPENDENCY'),
      ).length,
    };
  }
  async audit(toolKey: string) {
    const rows = await this.db.auditRecord.findMany({
      where: { targetId: toolKey, targetType: 'STUDENT_TOOL' },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return rows.map((row: any) => ({
      timestamp: row.timestamp,
      actor: row.actorId,
      action: row.action,
      summary: String((row.contextMetadata as Record<string, unknown>)?.summary ?? row.action),
      correlationId: row.correlationReference,
    }));
  }
}

function definitionData(value: StudentToolDefinition) {
  return {
    toolKey: value.toolKey,
    nameAr: value.nameAr,
    nameEn: value.nameEn,
    descriptionAr: value.descriptionAr,
    descriptionEn: value.descriptionEn,
    category: value.category,
    executionType: value.executionType,
    implementationPriority: value.implementationPriority,
    desiredLaunchVisibility: value.desiredLaunchVisibility,
    visibility: value.visibility,
    implementationStatus: value.implementationStatus,
    lifecycle: value.lifecycle,
    availability: json(value.availability),
    featureFlags: json(value.featureFlags),
    rateLimitPolicy: json(value.rateLimitPolicy),
    aiCapabilityKey: value.aiCapabilityKey,
    outputType: value.outputType,
    supportedLocales: json(value.supportedLocales),
    estimatedMinutes: value.estimatedMinutes,
    tags: json(value.tags),
    iconAssetId: value.iconAssetId,
    owner: value.owner,
    launchOrder: value.launchOrder,
    inputSchema: json(value.inputSchema),
    outputSchema: json(value.outputSchema),
  };
}
function versionData(
  value: StudentToolDefinition,
  snapshot = versionSnapshot(value),
  snapshotHash = hashSnapshot(snapshot),
) {
  return {
    semanticVersion: value.currentVersion.semanticVersion,
    inputSchemaVersion: value.currentVersion.inputSchemaVersion,
    outputSchemaVersion: value.currentVersion.outputSchemaVersion,
    releaseDate: new Date(value.currentVersion.releaseDate),
    changeNote: value.currentVersion.changeNote,
    status: value.currentVersion.status,
    snapshotHash,
    definitionSnapshot: json(snapshot),
  };
}
function versionSnapshot(value: StudentToolDefinition): StudentToolVersionSnapshot {
  return {
    inputSchema: value.inputSchema,
    outputSchema: value.outputSchema,
    dependencies: [...value.dependencies].sort((a, b) =>
      `${a.phase}|${a.type}|${a.capabilityKey ?? ''}|${a.description}`.localeCompare(
        `${b.phase}|${b.type}|${b.capabilityKey ?? ''}|${b.description}`,
      ),
    ),
    availability: value.availability,
    rateLimitPolicy: value.rateLimitPolicy,
    executionType: value.executionType,
    aiCapabilityKey: value.aiCapabilityKey ?? null,
    outputType: value.outputType,
    supportedLocales: [...value.supportedLocales],
  };
}
function hashSnapshot(value: StudentToolVersionSnapshot) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
function comparableSnapshot(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.snapshotProvenance;
  return copy;
}
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
function mapDefinition(row: any): StudentToolDefinition {
  const currentVersion =
    row.versions.find((item: any) => item.status === 'ACTIVE') ?? row.versions[0];
  return {
    ...row,
    availability: row.availability,
    featureFlags: row.featureFlags,
    rateLimitPolicy: row.rateLimitPolicy,
    supportedLocales: row.supportedLocales,
    tags: row.tags,
    inputSchema: row.inputSchema,
    outputSchema: row.outputSchema,
    currentVersion: currentVersion
      ? { ...currentVersion, snapshotHash: currentVersion.snapshotHash }
      : currentVersion,
    dependencies: row.dependencies.map(
      ({ id: _id, definitionId: _definitionId, ...item }: any) => item,
    ),
  };
}
async function appendExecutionEvent(
  tx: Db,
  eventType: string,
  toolKey: string,
  record: Partial<StudentToolExecutionRecord> & { executionId: string },
) {
  await tx.transactionalOutboxRecord.create({
    data: {
      id: randomUUID(),
      eventType,
      domain: 'STUDENT_TOOLS',
      aggregateType: 'STUDENT_TOOL_EXECUTION',
      aggregateId: record.executionId,
      payload: json({
        executionId: record.executionId,
        toolKey,
        status: record.status,
        durationMs: record.durationMs ?? null,
        errorCode: record.errorCode ?? null,
        isTest: record.isTest === true,
      }),
      metadata: json({ correlationId: record.correlationId ?? null, traceId: record.traceId ?? null }),
      correlationId: record.correlationId ?? record.executionId,
    },
  });
}
function executionData(value: Partial<StudentToolExecutionRecord>) {
  const data: Record<string, unknown> = {};
  for (const key of [
    'executionId',
    'toolVersion',
    'status',
    'consumerType',
    'studentReferenceHash',
    'anonymousSessionHash',
    'idempotencyKeyHash',
    'correlationId',
    'traceId',
    'aiExecutionReference',
    'durationMs',
    'errorCode',
    'isTest',
    'startedAt',
    'completedAt',
  ] as const)
    if (value[key] !== undefined) data[key] = value[key];
  if (value.dependencyStatus !== undefined)
    data.dependencyStatus =
      value.dependencyStatus == null ? Prisma.JsonNull : json(value.dependencyStatus);
  if (value.safeUsageMetadata !== undefined)
    data.safeUsageMetadata =
      value.safeUsageMetadata == null ? Prisma.JsonNull : json(value.safeUsageMetadata);
  return data;
}
function mapExecution(row: any, toolKey: string): StudentToolExecutionRecord {
  return {
    id: row.id,
    executionId: row.executionId,
    toolKey,
    toolVersion: row.toolVersion,
    versionRecordId: row.versionId,
    status: row.status,
    consumerType: row.consumerType,
    studentReferenceHash: row.studentReferenceHash,
    anonymousSessionHash: row.anonymousSessionHash,
    idempotencyKeyHash: row.idempotencyKeyHash,
    correlationId: row.correlationId,
    traceId: row.traceId,
    aiExecutionReference: row.aiExecutionReference,
    dependencyStatus: row.dependencyStatus,
    durationMs: row.durationMs,
    errorCode: row.errorCode,
    safeUsageMetadata: row.safeUsageMetadata,
    isTest: row.isTest,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    resultDigest: row.resultDigest ?? null,
    resultExpiresAt: row.resultExpiresAt ?? null,
  };
}
function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
async function appendMutation(
  tx: Db,
  toolKey: string,
  actorId: string,
  action: string,
  details: Record<string, unknown>,
) {
  const id = randomUUID();
  const now = new Date();
  await tx.auditRecord.create({
    data: {
      id,
      reference: `audit_${id}`,
      action,
      category: 'STUDENT_TOOLS',
      severity: 'INFO',
      actorId,
      actorType: 'IDENTITY',
      targetId: toolKey,
      targetType: 'STUDENT_TOOL',
      source: 'Phase18StudentTools',
      timestamp: now,
      contextMetadata: json({ summary: action, ...details }),
      correlationReference: id,
    },
  });
  await tx.transactionalOutboxRecord.create({
    data: {
      id: randomUUID(),
      eventType: action,
      domain: 'STUDENT_TOOLS',
      aggregateType: 'STUDENT_TOOL',
      aggregateId: toolKey,
      payload: json({ toolKey, ...details }),
      metadata: json({ actorReferenceId: actorId }),
      correlationId: id,
    },
  });
}
