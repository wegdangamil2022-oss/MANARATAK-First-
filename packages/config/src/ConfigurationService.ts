import { 
  IConfigurationService, 
  MissingConfigurationException, 
  InvalidConfigurationException 
} from '@manaratak/core';

export class ConfigurationService implements IConfigurationService {
  private readonly config: Map<string, unknown>;

  constructor(configRecord: Record<string, unknown>) {
    this.config = new Map(Object.entries(configRecord));
  }

  public get<T>(key: string): T {
    const value = this.config.get(key);
    if (value === undefined) {
      throw new MissingConfigurationException(key);
    }
    return value as T;
  }

  public getOptional<T>(key: string): T | undefined {
    return this.config.get(key) as T | undefined;
  }

  public getString(key: string): string {
    const value = this.get<unknown>(key);
    if (typeof value !== 'string') {
      throw new InvalidConfigurationException(key, 'Expected string');
    }
    return value;
  }

  public getNumber(key: string): number {
    const value = this.get<unknown>(key);
    const num = Number(value);
    if (isNaN(num) || typeof value === 'boolean' || value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      throw new InvalidConfigurationException(key, 'Expected number');
    }
    return num;
  }

  public getBoolean(key: string): boolean {
    const value = this.get<unknown>(key);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    throw new InvalidConfigurationException(key, 'Expected boolean');
  }
}
