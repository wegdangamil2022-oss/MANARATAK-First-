export class JobParameters {
  private constructor(private readonly payload: Readonly<Record<string, unknown>>) {}

  public static create(payload: Record<string, unknown> = {}): JobParameters {
    // Deep freeze could be applied here for strict immutability
    return new JobParameters(Object.freeze({ ...payload }));
  }

  public getPayload(): Readonly<Record<string, unknown>> {
    return this.payload;
  }
}
