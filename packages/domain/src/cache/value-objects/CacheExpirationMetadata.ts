export class CacheExpirationMetadata {
  private constructor(
    private readonly ttlSeconds: number,
    private readonly absoluteExpirationTime?: Date
  ) {}

  public static create(ttlSeconds: number, absoluteExpirationTime?: Date): CacheExpirationMetadata {
    if (ttlSeconds < 0) {
      throw new Error('TTL cannot be negative');
    }
    return new CacheExpirationMetadata(ttlSeconds, absoluteExpirationTime);
  }

  public getTtlSeconds(): number {
    return this.ttlSeconds;
  }

  public getAbsoluteExpirationTime(): Date | undefined {
    return this.absoluteExpirationTime;
  }

  public isExpired(currentTime: Date): boolean {
    if (this.absoluteExpirationTime && currentTime > this.absoluteExpirationTime) {
      return true;
    }
    return false;
  }
}
