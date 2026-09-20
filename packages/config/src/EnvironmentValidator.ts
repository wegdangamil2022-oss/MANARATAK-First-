import { AppConfigSchema } from './AppConfig';

export interface ISchemaValidator {
  validate(config: Record<string, unknown>): Record<string, unknown>;
}

export class DefaultEnvironmentValidator implements ISchemaValidator {
  public validate(config: Record<string, unknown>): Record<string, unknown> {
    // Foundational validation passthrough
    return config;
  }
}

export class ZodEnvironmentValidator implements ISchemaValidator {
  public validate(config: Record<string, unknown>): Record<string, unknown> {
    const result = AppConfigSchema.safeParse(config);
    if (!result.success) {
      const messages = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${messages}`);
    }
    return result.data as Record<string, unknown>;
  }
}
