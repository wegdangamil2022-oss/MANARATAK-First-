export class ConfigurationMetadata {
  private readonly data: ReadonlyMap<string, string>;

  constructor(data: Map<string, string> | Record<string, string>) {
    const map = data instanceof Map ? new Map(data) : new Map(Object.entries(data));
    this.data = Object.freeze(map);
  }

  public getData(): ReadonlyMap<string, string> {
    return this.data;
  }
}
