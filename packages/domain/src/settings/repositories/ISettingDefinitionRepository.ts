import { NamespacedKey } from '../value-objects/NamespacedKey';
import { SettingDefinition } from '../entities/SettingDefinition';

export interface ISettingDefinitionRepository {
  findByKey(key: NamespacedKey): Promise<SettingDefinition | null>;
  findAll(): Promise<SettingDefinition[]>;
  save(definition: SettingDefinition): Promise<void>;
}
