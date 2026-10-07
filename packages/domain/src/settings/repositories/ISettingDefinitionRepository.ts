import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import { NamespacedKey } from '../value-objects/NamespacedKey';
import { SettingDefinition } from '../entities/SettingDefinition';

export interface ISettingDefinitionRepository {
  withTransaction?(context: AtomicPersistenceContext): ISettingDefinitionRepository;
  findByKey(key: NamespacedKey): Promise<SettingDefinition | null>;
  findAll(): Promise<SettingDefinition[]>;
  save(definition: SettingDefinition): Promise<void>;
}
