export class JobParameters {
  private constructor(private readonly payload: Readonly<Record<string, any>>) {}

  public static create(payload: Record<string, any> = {}): JobParameters {
    // Deep freeze could be applied here for strict immutability
    return new JobParameters(Object.freeze({ ...payload }));
  }

  public getPayload(): Readonly<Record<string, any>> {
    return this.payload;
  }
}
