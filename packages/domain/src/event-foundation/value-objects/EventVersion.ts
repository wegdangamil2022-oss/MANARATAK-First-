export class EventVersion {
  private constructor(private readonly version: string) {}

  public static create(version: string): EventVersion {
    if (!version || version.trim().length === 0) {
      throw new Error('Event version cannot be empty');
    }
    return new EventVersion(version.trim());
  }

  public getVersion(): string {
    return this.version;
  }

  public equals(other: EventVersion): boolean {
    return this.version === other.getVersion();
  }
}
