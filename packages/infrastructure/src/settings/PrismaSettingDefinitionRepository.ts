import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  ISettingDefinitionRepository,
  SettingDefinition,
  NamespacedKey,
  ValueType,
  SettingDefinitionPageQuery,
  SettingValidationRules
} from '@manaratak/domain';

export interface SettingDefinitionRecordRow {
  id: string;
  key: string;
  valueType: string;
  description: string | null;
  defaultValue: unknown | null;
  validationRules?: unknown | null;
  isFeatureFlag: boolean;
  isDeprecated: boolean;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaSettingDefinitionDelegate {
  findUnique(args: { where: { key: string } }): Promise<SettingDefinitionRecordRow | null>;
  findMany(args?: { where?: unknown }): Promise<SettingDefinitionRecordRow[]>;
  upsert(args: {
    where: { key: string };
    update: Omit<SettingDefinitionRecordRow, 'createdAt' | 'updatedAt' | 'id' | 'key'> & { updatedAt?: Date };
    create: Omit<SettingDefinitionRecordRow, 'createdAt' | 'updatedAt'>;
  }): Promise<SettingDefinitionRecordRow>;
}

export interface SettingsPrismaClient {
  settingDefinitionRecord: PrismaSettingDefinitionDelegate;
}

export class PrismaSettingDefinitionRepository implements ISettingDefinitionRepository {
  constructor(private readonly prisma: PrismaClient, private readonly transactional = false) {}

  withTransaction(context: AtomicPersistenceContext): ISettingDefinitionRepository {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('SETTINGS_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaSettingDefinitionRepository(tx as unknown as PrismaClient, true);
  }

  private get client(): SettingsPrismaClient {
    return this.prisma as unknown as SettingsPrismaClient;
  }

  private mapToDomain(row: SettingDefinitionRecordRow): SettingDefinition {
    return new SettingDefinition({
      id: row.id,
      revision: row.updatedAt.toISOString(),
      key: new NamespacedKey(row.key),
      valueType: row.valueType as ValueType,
      description: row.description || undefined,
      defaultValue: row.defaultValue,
      validationRules: row.validationRules == null ? undefined : row.validationRules as SettingValidationRules,
      isFeatureFlag: row.isFeatureFlag,
      isDeprecated: row.isDeprecated,
      isSecret: row.isSecret
    }, false);
  }

  async findByKey(key: NamespacedKey): Promise<SettingDefinition | null> {
    const record = await this.client.settingDefinitionRecord.findUnique({
      where: { key: key.getValue() }
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAll(): Promise<SettingDefinition[]> {
    const records = await this.client.settingDefinitionRecord.findMany();
    return records
      .map((record) => this.mapToDomain(record))
      .sort((a, b) => a.key.getValue().localeCompare(b.key.getValue()));
  }

  async findPage(query: SettingDefinitionPageQuery) {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) throw new Error('SETTINGS_PAGE_LIMIT_INVALID');
    const classification = query.classification ?? 'ALL';
    const classFilter = classification === 'SECRET' ? { isSecret: true }
      : classification === 'FLAG' ? { isFeatureFlag: true }
      : classification === 'DEPRECATED' ? { isDeprecated: true }
      : classification === 'SETTING' ? { isSecret: false, isFeatureFlag: false, isDeprecated: false } : {};
    const rows = await this.prisma.settingDefinitionRecord.findMany({
      where: { ...classFilter, ...(query.cursor ? { key: { gt: query.cursor } } : {}),
        ...(query.q ? { OR: [{ key: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {}) },
      orderBy: { key: 'asc' }, take: query.limit + 1,
    });
    const items = rows.slice(0, query.limit);
    return { items: items.map(row => this.mapToDomain(row)), nextCursor: rows.length > query.limit ? items.at(-1)?.key : undefined };
  }

  async findByKeys(keys: string[]) {
    if (keys.length > 100) throw new Error('SETTINGS_PAGE_LIMIT_INVALID');
    const rows = await this.prisma.settingDefinitionRecord.findMany({ where: { key: { in: keys } } });
    return rows.map(row => this.mapToDomain(row));
  }

  async save(definition: SettingDefinition, metadata?: { correlationId: string }): Promise<void> {
    const keyStr = definition.key.getValue();
    const data = {
      valueType: definition.valueType,
      description: definition.description || null,
      defaultValue: definition.defaultValue === undefined || definition.defaultValue === null ? Prisma.DbNull : definition.defaultValue as Prisma.InputJsonValue,
      validationRules: definition.validationRules === undefined ? Prisma.DbNull : definition.validationRules as Prisma.InputJsonValue,
      isFeatureFlag: definition.isFeatureFlag,
      isDeprecated: definition.isDeprecated,
      isSecret: definition.isSecret
    };
    const events = [...definition.domainEvents];
    const persist = async (client: Prisma.TransactionClient) => {
      await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`setting-definition:${keyStr}`}, 0))::text AS lock_result`;
      const existing = await client.settingDefinitionRecord.findUnique({ where: { key: keyStr } });
      if (events.some(event => event.constructor.name === 'SettingDefinitionCreatedEvent') && existing) {
        throw new Error(`Setting definition for key ${keyStr} already exists.`);
      }
      if (existing && (existing.id !== definition.id || existing.updatedAt.toISOString() !== definition.revision)) {
        throw new Error('SETTINGS_DEFINITION_CONFLICT');
      }
      const updatedAt = new Date(Math.max(Date.now(), existing ? existing.updatedAt.getTime() + 1 : 0));
      await client.settingDefinitionRecord.upsert({
        where: { key: keyStr },
        update: { ...data, updatedAt },
        create: { id: definition.id, key: keyStr, ...data }
      });
      if (events.length) {
        if (!client.transactionalOutboxRecord?.create) throw new Error('SETTINGS_DURABLE_OUTBOX_REQUIRED');
        for (const event of events) {
          const name = (event as any)?.constructor?.name;
          const eventType = name === 'SettingDefinitionCreatedEvent' ? 'SettingDefinitionCreated.v1' : name === 'SettingDefinitionUpdatedEvent' ? 'SettingDefinitionUpdated.v1' : null;
          if (!eventType) throw new Error(`SETTINGS_DOMAIN_EVENT_NOT_MAPPED:${String(name || 'UNKNOWN')}`);
          await client.transactionalOutboxRecord.create({ data: {
            id: randomUUID(), eventType, domain: 'SETTINGS', aggregateType: 'SettingDefinition', aggregateId: definition.id,
            payload: { definitionId: definition.id, key: keyStr }, metadata: { schemaVersion: 1, ownerDomain: 'SETTINGS' }, correlationId: metadata?.correlationId ?? randomUUID(),
            state: 'PENDING', attempts: 0, availableAt: new Date(), createdAt: (event as any).dateTimeOccurred ?? new Date(),
          }});
        }
      }
    };
    if (events.length || this.transactional) {
      if (this.transactional) await persist(this.prisma);
      else await this.prisma.$transaction(persist);
      definition.clearEvents();
    } else {
      await this.prisma.$transaction(persist);
    }
  }

}

