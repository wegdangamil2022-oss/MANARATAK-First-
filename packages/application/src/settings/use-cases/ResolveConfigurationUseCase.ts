import { ConfigurationResolutionContext, ConfigurationResolutionService, NamespacedKey, ResolutionOptions } from '@manaratak/domain';

export class ResolveConfigurationUseCase {
  constructor(private resolutionService: ConfigurationResolutionService) {}

  public async resolveSetting(
    keyStr: string,
    context: ConfigurationResolutionContext = {},
    options?: ResolutionOptions
  ): Promise<unknown> {
    const key = new NamespacedKey(keyStr);
    return this.resolutionService.resolve(key, context, options);
  }
}
