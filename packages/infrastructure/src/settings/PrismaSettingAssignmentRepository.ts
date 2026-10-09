import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  ISettingAssignmentRepository,
  SettingAssignmentPageQuery,
  SettingAssignment,
  SettingVersion,
  NamespacedKey,
  ScopeIdentifier,
  ValueType,
  SettingValueData,
  StringValue,
  NumberValue,
  BooleanValue,
  JsonValue,
  SettingDefinition,
  ConfigurationValidationService
} from '@manaratak/domain';

export interface SettingVersionRecordRow {
  id: string;
  assignmentId: string;
  value: unknown;
  valueType: string;
  authorId: string | null;
  createdAt: Date;
  rollbackOfVersionId: string | null;
  operation?: string;
  changeReason?: string | null;
}

export interface SettingAssignmentRecordRow {
  id: string;
  key: string;
  scopeLevel: string;
  scopeId: string;
  currentVersionId: string;
  createdAt: Date;
  updatedAt: Date;
  versions?: SettingVersionRecordRow[];
}

export interface PrismaSettingAssignmentDelegate {
  findUnique(args: {
    where:
      | { id: string }
      | { key_scopeLevel_scopeId: { key: string, scopeLevel: string, scopeId: string } };
    include?: unknown;
  }): Promise<SettingAssignmentRecordRow | null>;
  findMany(args?: { where?: unknown, include?: unknown }): Promise<SettingAssignmentRecordRow[]>;
  upsert(args: {
    where: { key_scopeLevel_scopeId: { key: string, scopeLevel: string, scopeId: string } };
    update: Omit<SettingAssignmentRecordRow, 'createdAt' | 'updatedAt' | 'id' | 'key' | 'scopeLevel' | 'scopeId' | 'versions'>;
    create: Omit<SettingAssignmentRecordRow, 'createdAt' | 'updatedAt' | 'versions'>;
  }): Promise<SettingAssignmentRecordRow>;
}

export interface PrismaSettingVersionDelegate {
  findUnique(args: { where: { id: string } }): Promise<SettingVersionRecordRow | null>;
  create(args: { data: Omit<SettingVersionRecordRow, 'createdAt'> }): Promise<SettingVersionRecordRow>;
}

export interface SettingsAssignmentPrismaClient {
  settingAssignmentRecord: PrismaSettingAssignmentDelegate;
  settingVersionRecord: PrismaSettingVersionDelegate;
}

export class PrismaSettingAssignmentRepository implements ISettingAssignmentRepository {
  constructor(private readonly prisma: PrismaClient, private readonly transactional = false) {}

  withTransaction(context: AtomicPersistenceContext): ISettingAssignmentRepository {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('SETTINGS_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaSettingAssignmentRepository(tx as unknown as PrismaClient, true);
  }

  private get client(): SettingsAssignmentPrismaClient {
    return this.prisma as unknown as SettingsAssignmentPrismaClient;
  }

  private createValueData(type: string, value: unknown): SettingValueData {
    switch (type) {
      case ValueType.String: return new StringValue(value as string);
      case ValueType.Number: return new NumberValue(value as number);
      case ValueType.Boolean: return new BooleanValue(value as boolean);
      case ValueType.Json: return new JsonValue(value as Record<string, unknown>);
      default: throw new Error(`Unsupported value type: ${type}`);
    }
  }

  private mapToDomain(row: SettingAssignmentRecordRow): SettingAssignment {
    const versions = (row.versions || []).map(vRow => {
      return new SettingVersion(
        vRow.id,
        this.createValueData(vRow.valueType, vRow.value),
        vRow.createdAt,
        vRow.authorId || undefined,
        vRow.rollbackOfVersionId || undefined,
        (vRow.operation ?? 'SET') as 'SET' | 'CLEAR_OVERRIDE',
        vRow.changeReason ?? undefined,
      );
    });
    
    // Preserve historical ordering but honor the persisted currentVersionId explicitly.
    versions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const currentIndex = versions.findIndex((version) => version.id === row.currentVersionId);
    if (currentIndex < 0) {
      throw new Error(`Setting assignment ${row.id} references missing current version ${row.currentVersionId}.`);
    }
    const [currentVersion] = versions.splice(currentIndex, 1);
    versions.push(currentVersion);

    // GLOBAL is a storage uniqueness sentinel, never a Domain scope identifier.
    if (row.scopeLevel === 'GLOBAL' && row.scopeId !== 'GLOBAL') {
      throw new Error('SETTINGS_GLOBAL_STORAGE_SCOPE_INVALID');
    }
    return new SettingAssignment({
      id: row.id,
      key: new NamespacedKey(row.key),
      scope: new ScopeIdentifier(row.scopeLevel, row.scopeLevel === 'GLOBAL' ? undefined : row.scopeId || undefined),
      versions
    }, false);
  }

  async findByScopeAndKey(scope: ScopeIdentifier, key: NamespacedKey): Promise<SettingAssignment | null> {
    const record = await this.client.settingAssignmentRecord.findUnique({
      where: {
        key_scopeLevel_scopeId: {
          key: key.getValue(),
          scopeLevel: scope.getLevel(),
          scopeId: scope.getScopeId() || 'GLOBAL'
        }
      },
      include: {
        versions: true
      }
    });

    return record ? this.mapToDomain(record) : null;
  }

  async findById(id: string): Promise<SettingAssignment | null> {
    const row = await this.prisma.settingAssignmentRecord.findUnique({ where: { id }, include: { versions: true } });
    return row ? this.mapToDomain(row) : null;
  }

  async countByKey(key: NamespacedKey): Promise<number> {
    return this.prisma.settingAssignmentRecord.count({ where: { key: key.getValue() } });
  }

  async readSummaries(filters: { key?: string; level?: string; scopeId?: string }) {
    const records = await this.prisma.settingAssignmentRecord.findMany({
      where: { key: filters.key, scopeLevel: filters.level, scopeId: filters.scopeId },
      include: { _count: { select: { versions: true } } },
      orderBy: [{ key: 'asc' }, { scopeLevel: 'asc' }, { scopeId: 'asc' }],
    });
    const currentRows = await this.prisma.settingVersionRecord.findMany({
      where: { id: { in: records.map(row => row.currentVersionId) } },
    });
    const current = new Map(currentRows.map(row => [row.id, row]));
    return records.map(row => {
      const version = current.get(row.currentVersionId);
      if (!version || version.assignmentId !== row.id) throw new Error('SETTINGS_CURRENT_VERSION_INVALID');
      if (row.scopeLevel === 'GLOBAL' && row.scopeId !== 'GLOBAL') throw new Error('SETTINGS_GLOBAL_STORAGE_SCOPE_INVALID');
      // This is a read projection, never a writable aggregate with partial history.
      const scope = new ScopeIdentifier(row.scopeLevel, row.scopeLevel === 'GLOBAL' ? undefined : row.scopeId || undefined);
      const currentVersion = new SettingVersion(version.id, this.createValueData(version.valueType, version.value),
        version.createdAt, version.authorId ?? undefined, version.rollbackOfVersionId ?? undefined,
        version.operation as 'SET' | 'CLEAR_OVERRIDE', version.changeReason ?? undefined);
      return { id: row.id, key: row.key, scope, currentVersion, versionCount: row._count.versions };
    });
  }

  async readSummaryPage(query: SettingAssignmentPageQuery) {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) throw new Error('SETTINGS_PAGE_LIMIT_INVALID');
    const rows = await this.prisma.settingAssignmentRecord.findMany({
      where: { key: query.key, scopeLevel: query.level, scopeId: query.scopeId,
        ...(query.cursor ? { id: { gt: query.cursor } } : {}),
        ...(query.q ? { OR: [{ key: { contains: query.q, mode: 'insensitive' } }, { scopeId: { contains: query.q, mode: 'insensitive' } }] } : {}) },
      include: { _count: { select: { versions: true } } }, orderBy: { id: 'asc' }, take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const versions = await this.prisma.settingVersionRecord.findMany({ where: { id: { in: page.map(row => row.currentVersionId) } } });
    const byId = new Map(versions.map(row => [row.id, row]));
    const items = page.map(row => {
      const current = byId.get(row.currentVersionId);
      if (!current || current.assignmentId !== row.id) throw new Error('SETTINGS_DURABLE_CURRENT_VERSION_INVALID');
      if (row.scopeLevel === 'GLOBAL' && row.scopeId !== 'GLOBAL') throw new Error('SETTINGS_GLOBAL_STORAGE_SCOPE_INVALID');
      return { id: row.id, key: row.key,
        scope: new ScopeIdentifier(row.scopeLevel, row.scopeLevel === 'GLOBAL' ? undefined : row.scopeId || undefined),
        currentVersion: new SettingVersion(current.id, this.createValueData(current.valueType, current.value), current.createdAt,
          current.authorId ?? undefined, current.rollbackOfVersionId ?? undefined, current.operation as 'SET' | 'CLEAR_OVERRIDE', current.changeReason ?? undefined),
        versionCount: row._count.versions };
    });
    return { items, nextCursor: rows.length > query.limit ? page.at(-1)?.id : undefined };
  }

  async readHistory(id: string, expectedCurrentVersionId: string, limit: number, cursor?: string) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid history page size');
    const assignment = await this.prisma.settingAssignmentRecord.findUnique({ where: { id } });
    if (!assignment) throw new Error('Setting assignment not found');
    if (assignment.currentVersionId !== expectedCurrentVersionId) throw new Error('SETTINGS_ASSIGNMENT_CONFLICT');
    const current = await this.prisma.settingVersionRecord.findUnique({ where: { id: assignment.currentVersionId } });
    if (!current || current.assignmentId !== id) throw new Error('SETTINGS_DURABLE_CURRENT_VERSION_INVALID');
    const anchor = cursor ? await this.prisma.settingVersionRecord.findUnique({ where: { id: cursor } }) : null;
    if (cursor && (!anchor || anchor.assignmentId !== id)) throw new Error('SETTINGS_HISTORY_CURSOR_INVALID');
    const rows = await this.prisma.settingVersionRecord.findMany({
      where: { assignmentId: id, ...(anchor ? { OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ] } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
    });
    const after = await this.prisma.settingAssignmentRecord.findUnique({ where: { id } });
    if (!after || after.currentVersionId !== expectedCurrentVersionId) throw new Error('SETTINGS_ASSIGNMENT_CONFLICT');
    const page = rows.slice(0, limit);
    return { key: assignment.key, nextCursor: rows.length > limit ? page.at(-1)?.id : undefined,
      versions: page.map(row => new SettingVersion(row.id, this.createValueData(row.valueType, row.value),
        row.createdAt, row.authorId ?? undefined, row.rollbackOfVersionId ?? undefined,
        row.operation as 'SET' | 'CLEAR_OVERRIDE', row.changeReason ?? undefined)) };
  }

  async findBy(spec: { isSatisfiedBy: (assignment: SettingAssignment) => boolean }): Promise<SettingAssignment[]> {
    // Note: Due to lack of query specifications, we fetch all. 
    // In a real implementation we would map the spec to prisma query.
    const records = await this.client.settingAssignmentRecord.findMany({
      include: {
        versions: true
      }
    });
    
    const assignments = records.map(record => this.mapToDomain(record));
    return assignments.filter(assignment => spec.isSatisfiedBy(assignment));
  }

  async save(assignment: SettingAssignment, metadata?: { correlationId: string }): Promise<void> {
    const keyStr = assignment.key.getValue();
    const scopeLevel = assignment.scope.getLevel();
    const scopeId = assignment.scope.getScopeId() || 'GLOBAL';
    const currentVersion = assignment.getCurrentVersion();
    const events = [...assignment.domainEvents];

    const persist = async (tx: Prisma.TransactionClient) => {
      // All Settings writers acquire definition before assignment, so deprecation
      // and a value write cannot pass independent prechecks and race to commit.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`setting-definition:${keyStr}`}, 0))::text AS lock_result`;
      const record = await tx.settingDefinitionRecord.findUnique({ where: { key: keyStr } });
      if (!record || record.isDeprecated || record.isSecret) throw new Error('SETTINGS_DEFINITION_NOT_WRITABLE');
      const definition = new SettingDefinition({ id: record.id, key: new NamespacedKey(record.key),
        valueType: record.valueType as ValueType, defaultValue: record.defaultValue,
        isFeatureFlag: record.isFeatureFlag, isSecret: record.isSecret, isDeprecated: record.isDeprecated });
      new ConfigurationValidationService().validate(definition, currentVersion.value);
      const lockKey = `setting:${keyStr}:${scopeLevel}:${scopeId}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS lock_result`;
      const client = tx as unknown as SettingsAssignmentPrismaClient;
      const existingByKey = await client.settingAssignmentRecord.findUnique({
        where: {
          key_scopeLevel_scopeId: {
            key: keyStr,
            scopeLevel,
            scopeId,
          }
        }
      });
      const existingById = await client.settingAssignmentRecord.findUnique({
        where: { id: assignment.id }
      });

      if (existingByKey && existingByKey.id !== assignment.id) {
        throw new Error(
          `Setting assignment ${keyStr} at ${scopeLevel}:${scopeId} already belongs to ${existingByKey.id} and cannot be reassigned.`
        );
      }
      if (
        existingById &&
        (
          existingById.key !== keyStr ||
          existingById.scopeLevel !== scopeLevel ||
          existingById.scopeId !== scopeId
        )
      ) {
        throw new Error(
          `Setting assignment id ${assignment.id} already belongs to another key or scope and cannot be reused.`
        );
      }

      if (existingByKey && !assignment.getVersions().some(version => version.id === existingByKey.currentVersionId)) {
        throw new Error('SETTINGS_VERSION_CONFLICT: Reload the current value before saving.');
      }

      const versionsToCreate: Array<{
        id: string;
        assignmentId: string;
        value: unknown;
        valueType: string;
        authorId: string | null;
        rollbackOfVersionId: string | null;
        operation: 'SET' | 'CLEAR_OVERRIDE';
        changeReason: string | null;
      }> = [];

      // Preflight the entire immutable history before changing the assignment pointer.
      // A reused id is valid only when it already represents this exact historical row.
      for (const version of assignment.getVersions()) {
        const persisted = await client.settingVersionRecord.findUnique({ where: { id: version.id } });
        const value = version.value.getValue();
        const authorId = version.authorId || null;
        const rollbackOfVersionId = version.rollbackOfVersionId || null;

        if (persisted) {
          const sameValue = JSON.stringify(persisted.value) === JSON.stringify(value);
          if (
            persisted.assignmentId !== assignment.id ||
            persisted.valueType !== version.value.type ||
            persisted.authorId !== authorId ||
            persisted.rollbackOfVersionId !== rollbackOfVersionId ||
            (persisted.operation ?? 'SET') !== version.operation ||
            (persisted.changeReason ?? null) !== (version.changeReason ?? null) ||
            !sameValue
          ) {
            throw new Error(`Setting version ${version.id} already exists and cannot be mutated or reassigned.`);
          }
          continue;
        }

        versionsToCreate.push({
          id: version.id,
          assignmentId: assignment.id,
          value,
          valueType: version.value.type,
          authorId,
          rollbackOfVersionId,
          operation: version.operation,
          changeReason: version.changeReason ?? null,
        });
      }

      const currentVersionIsNew = versionsToCreate.some((version) => version.id === currentVersion.id);
      if (
        existingByKey &&
        currentVersion.id !== existingByKey.currentVersionId &&
        !currentVersionIsNew
      ) {
        throw new Error(
          `Setting assignment ${assignment.id} cannot move currentVersionId directly to historical version ${currentVersion.id}; rollback must create a new immutable version.`
        );
      }

      await client.settingAssignmentRecord.upsert({
        where: {
          key_scopeLevel_scopeId: {
            key: keyStr,
            scopeLevel,
            scopeId,
          }
        },
        update: { currentVersionId: currentVersion.id },
        create: {
          id: assignment.id,
          key: keyStr,
          scopeLevel,
          scopeId,
          currentVersionId: currentVersion.id,
        }
      });

      for (const version of versionsToCreate) {
        await client.settingVersionRecord.create({ data: version });
      }

      if (events.length) {
        const outbox = (tx as any).transactionalOutboxRecord;
        if (!outbox?.create) throw new Error('SETTINGS_DURABLE_OUTBOX_REQUIRED');
        for (const event of events) {
          const value = event as any;
          const name = value?.constructor?.name;
          const map: Record<string, string> = {
            SettingValueAssignedEvent: 'SettingValueAssigned.v1',
            SettingValueUpdatedEvent: 'SettingValueUpdated.v1',
            SettingValueRolledBackEvent: 'SettingValueRolledBack.v1',
            SettingOverrideClearedEvent: 'SettingOverrideCleared.v1',
          };
          const eventType = map[name];
          if (!eventType) throw new Error(`SETTINGS_DOMAIN_EVENT_NOT_MAPPED:${String(name || 'UNKNOWN')}`);
          const payload: Record<string, unknown> = { assignmentId: assignment.id, key: keyStr, scopeLevel, scopeId, operation: currentVersion.operation, ...(currentVersion.changeReason ? { changeReason: currentVersion.changeReason } : {}) };
          if (value.versionId) payload.versionId = value.versionId;
          if (value.previousVersionId) payload.previousVersionId = value.previousVersionId;
          if (value.newVersionId) payload.newVersionId = value.newVersionId;
          await outbox.create({ data: {
            id: randomUUID(), eventType, domain: 'SETTINGS', aggregateType: 'SettingAssignment', aggregateId: assignment.id,
            payload, metadata: { schemaVersion: 1, ownerDomain: 'SETTINGS', settingsEventRole: 'OWNER_DOMAIN_EVENT' }, correlationId: metadata?.correlationId ?? randomUUID(), state: 'PENDING', attempts: 0,
            availableAt: new Date(), createdAt: value.dateTimeOccurred ?? new Date(),
          }});
        }
      }
    };
    if (this.transactional) await persist(this.prisma);
    else await this.prisma.$transaction(persist);
    if (events.length) assignment.clearEvents();
  }
}
