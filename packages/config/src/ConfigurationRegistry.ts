import { IConfigurationService } from '@manaratak/core';
import { ConfigurationService } from './ConfigurationService';
import { EnvironmentLoader } from './EnvironmentLoader';
import { ISchemaValidator, DefaultEnvironmentValidator } from './EnvironmentValidator';

export class ConfigurationRegistry {
  private static instance: IConfigurationService | null = null;

  public static async bootstrap(
    loader: EnvironmentLoader,
    validator: ISchemaValidator = new DefaultEnvironmentValidator()
  ): Promise<IConfigurationService> {
    if (this.instance) {
      throw new Error('ConfigurationRegistry has already been bootstrapped.');
    }

    const rawConfig = await loader.loadAll();
    const validatedConfig = validator.validate(rawConfig);
    
    // Freeze configuration to guarantee runtime immutability
    const immutableConfig = Object.freeze({ ...validatedConfig });
    
    this.instance = new ConfigurationService(immutableConfig);
    return this.instance;
  }

  public static getInstance(): IConfigurationService {
    if (!this.instance) {
      throw new Error('ConfigurationRegistry has not been bootstrapped. Call bootstrap() first.');
    }
    return this.instance;
  }

  public static isInitialized(): boolean {
    return this.instance !== null;
  }

  public static getOptionalInstance(): IConfigurationService | null {
    return this.instance;
  }

  // Internal test utility to reset singleton state
  public static _reset(): void {
    this.instance = null;
  }
}
