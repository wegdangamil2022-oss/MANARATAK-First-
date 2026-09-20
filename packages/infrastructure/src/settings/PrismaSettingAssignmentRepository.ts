import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  ISettingAssignmentRepository,
  SettingAssignment,
  SettingVersion,
  NamespacedKey,
  ScopeIdentifier,
  ValueType,
  SettingValueData,
  StringValue,
  NumberValue,
  BooleanValue,
  JsonValue
} from '@manaratak/domain';

export interface SettingVersionRecordRow {
  id: string;
  assignmentId: string;
  value: unknown;
  valueType: string;
  authorId: string | null;
  createdAt: Date;
  rollbackOfVersionId: string | null;
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
  constructor(private readonly prisma: PrismaClient) {}

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

    return new SettingAssignment({
      id: row.id,
      key: new NamespacedKey(row.key),
      scope: new ScopeIdentifier(row.scopeLevel, row.scopeId || undefined),
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

  async save(assignment: SettingAssignment): Promise<void> {
    const keyStr = assignment.key.getValue();
    const scopeLevel = assignment.scope.getLevel();
    const scopeId = assignment.scope.getScopeId() || 'GLOBAL';
    const currentVersion = assignment.getCurrentVersion();
    const events = [...assignment.domainEvents];

    await this.prisma.$transaction(async (tx) => {
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

      const versionsToCreate: Array<{
        id: string;
        assignmentId: string;
        value: unknown;
        valueType: string;
        authorId: string | null;
        rollbackOfVersionId: string | null;
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
          };
          const eventType = map[name];
          if (!eventType) throw new Error(`SETTINGS_DOMAIN_EVENT_NOT_MAPPED:${String(name || 'UNKNOWN')}`);
          const payload: Record<string, unknown> = { assignmentId: assignment.id, key: keyStr, scopeLevel, scopeId };
          if (value.versionId) payload.versionId = value.versionId;
          if (value.previousVersionId) payload.previousVersionId = value.previousVersionId;
          if (value.newVersionId) payload.newVersionId = value.newVersionId;
          await outbox.create({ data: {
            id: randomUUID(), eventType, domain: 'SETTINGS', aggregateType: 'SettingAssignment', aggregateId: assignment.id,
            payload, metadata: { schemaVersion: 1, ownerDomain: 'SETTINGS' }, correlationId: randomUUID(), state: 'PENDING', attempts: 0,
            availableAt: new Date(), createdAt: value.dateTimeOccurred ?? new Date(),
          }});
        }
      }
    });
    if (events.length) assignment.clearEvents();
  }
}
