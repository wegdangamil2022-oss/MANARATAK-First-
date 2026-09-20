import { ConfigurationDefinition } from '../value-objects/ConfigurationDefinition';
import { ConfigurationValueDefinition } from '../value-objects/ConfigurationValueDefinition';

export class ConfigurationFoundationValidationService {
  public static validate(definition: ConfigurationDefinition, _valueDefinition: ConfigurationValueDefinition): void {
    if (!definition.getPurpose().trim()) {
      throw new Error('Configuration purpose cannot be empty');
    }
  }
}
