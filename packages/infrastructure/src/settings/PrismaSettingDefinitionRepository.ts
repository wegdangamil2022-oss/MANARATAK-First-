import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  ISettingDefinitionRepository,
  SettingDefinition,
  NamespacedKey,
  ValueType
} from '@manaratak/domain';

export interface SettingDefinitionRecordRow {
  id: string;
  key: string;
  valueType: string;
  description: string | null;
  defaultValue: unknown | null;
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
    update: Omit<SettingDefinitionRecordRow, 'createdAt' | 'updatedAt' | 'id' | 'key'>;
    create: Omit<SettingDefinitionRecordRow, 'createdAt' | 'updatedAt'>;
  }): Promise<SettingDefinitionRecordRow>;
}

export interface SettingsPrismaClient {
  settingDefinitionRecord: PrismaSettingDefinitionDelegate;
}

export class PrismaSettingDefinitionRepository implements ISettingDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private get client(): SettingsPrismaClient {
    return this.prisma as unknown as SettingsPrismaClient;
  }

  private mapToDomain(row: SettingDefinitionRecordRow): SettingDefinition {
    return new SettingDefinition({
      id: row.id,
      key: new NamespacedKey(row.key),
      valueType: row.valueType as ValueType,
      description: row.description || undefined,
      defaultValue: row.defaultValue,
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

  async save(definition: SettingDefinition): Promise<void> {
    const keyStr = definition.key.getValue();
    const data = {
      valueType: definition.valueType,
      description: definition.description || null,
      defaultValue: definition.defaultValue !== undefined ? definition.defaultValue : null,
      isFeatureFlag: definition.isFeatureFlag,
      isDeprecated: definition.isDeprecated,
      isSecret: definition.isSecret
    };
    const events = [...definition.domainEvents];
    const persist = async (client: any) => {
      await client.settingDefinitionRecord.upsert({
        where: { key: keyStr },
        update: data,
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
            payload: { definitionId: definition.id, key: keyStr }, metadata: { schemaVersion: 1, ownerDomain: 'SETTINGS' }, correlationId: randomUUID(),
            state: 'PENDING', attempts: 0, availableAt: new Date(), createdAt: (event as any).dateTimeOccurred ?? new Date(),
          }});
        }
      }
    };
    if (events.length) {
      await this.prisma.$transaction(async tx => persist(tx));
      definition.clearEvents();
    } else {
      await persist(this.prisma as any);
    }
  }

}

