export class CacheInvalidationMetadata {
  private constructor(private readonly invalidationTokens: ReadonlyArray<string>) {}

  public static create(invalidationTokens: string[] = []): CacheInvalidationMetadata {
    return new CacheInvalidationMetadata(Object.freeze([...invalidationTokens]));
  }

  public getInvalidationTokens(): ReadonlyArray<string> {
    return this.invalidationTokens;
  }

  public matchesToken(token: string): boolean {
    return this.invalidationTokens.includes(token);
  }
}
