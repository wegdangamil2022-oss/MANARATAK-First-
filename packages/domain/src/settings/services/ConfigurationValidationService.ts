import { SettingDefinition } from '../entities/SettingDefinition';
import { SettingValueData } from '../value-objects/SettingValueData';

export class ConfigurationValidationService {
  public validate(definition: SettingDefinition, value: SettingValueData): void {
    if (!definition) {
      throw new Error('Setting definition is required for validation.');
    }
    if (!value) {
      throw new Error('Setting value data is required for validation.');
    }
    if (definition.valueType !== value.type) {
      throw new Error(`Type mismatch for setting '${definition.key.getValue()}'. Expected type '${definition.valueType}' but got '${value.type}'.`);
    }
  }
}
