import { IConfigurationProvider } from '@manaratak/core';

export class EnvironmentConfigurationProvider implements IConfigurationProvider {
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  public load(): Record<string, unknown> {
    return { ...this.env };
  }
}
