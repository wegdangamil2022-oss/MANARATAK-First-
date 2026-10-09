import { ConfigurationResolutionContext, IResolvedSettingsReader, ResolvedSetting, ResolutionOptions } from '@manaratak/domain';

export class ResolveConfigurationUseCase {
  constructor(private readonly resolutionService: IResolvedSettingsReader) {}

  public async inspectSetting(key: string, context: ConfigurationResolutionContext = {}): Promise<ResolvedSetting> {
    return this.resolutionService.readSetting(key, context);
  }

  public async resolveSetting(key: string, context: ConfigurationResolutionContext = {}, _options?: ResolutionOptions): Promise<unknown> {
    const result = await this.inspectSetting(key, context);
    return result.status === 'RESOLVED' ? result.value : null;
  }
}
