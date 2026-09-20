export class CachePolicy {
  private constructor(private readonly tags: ReadonlyArray<string>) {}

  public static create(tags: string[] = []): CachePolicy {
    return new CachePolicy(Object.freeze([...tags]));
  }

  public getTags(): ReadonlyArray<string> {
    return this.tags;
  }
}
