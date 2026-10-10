import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import { NamespacedKey } from '../value-objects/NamespacedKey';
import { SettingDefinition } from '../entities/SettingDefinition';

export interface SettingDefinitionPageQuery {
  q?: string; classification?: 'ALL' | 'SETTING' | 'FLAG' | 'SECRET' | 'DEPRECATED';
  limit: number; cursor?: string;
}
export interface ISettingDefinitionRepository {
  findPage?(query: SettingDefinitionPageQuery): Promise<{ items: SettingDefinition[]; nextCursor?: string }>;
  findByKeys?(keys: string[]): Promise<SettingDefinition[]>;
  withTransaction?(context: AtomicPersistenceContext): ISettingDefinitionRepository;
  findByKey(key: NamespacedKey): Promise<SettingDefinition | null>;
  findAll(): Promise<SettingDefinition[]>;
  save(definition: SettingDefinition, metadata?: { correlationId: string }): Promise<void>;
}
