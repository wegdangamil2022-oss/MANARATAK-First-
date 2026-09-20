export class ApiMetadata {
  constructor(
    private readonly properties: ReadonlyMap<string, string> = new Map()
  ) {}

  public getProperties(): ReadonlyMap<string, string> {
    return this.properties;
  }

  public getProperty(key: string): string | undefined {
    return this.properties.get(key);
  }

  public equals(other: ApiMetadata): boolean {
    if (this.properties.size !== other.getProperties().size) return false;
    for (const [key, value] of this.properties.entries()) {
      if (other.getProperty(key) !== value) return false;
    }
    return true;
  }
}
