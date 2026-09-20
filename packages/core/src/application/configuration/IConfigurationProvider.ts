export interface IConfigurationProvider {
  load(): Promise<Record<string, unknown>> | Record<string, unknown>;
}
