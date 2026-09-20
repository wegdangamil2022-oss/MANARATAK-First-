import { IConfigurationProvider } from '@manaratak/core';

export class EnvironmentLoader {
  constructor(private readonly providers: IConfigurationProvider[]) {}

  public async loadAll(): Promise<Record<string, unknown>> {
    let combinedConfig: Record<string, unknown> = {};
    for (const provider of this.providers) {
      const config = await Promise.resolve(provider.load());
      combinedConfig = { ...combinedConfig, ...config };
    }
    return combinedConfig;
  }
}
