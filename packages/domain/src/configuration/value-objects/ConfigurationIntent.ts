export class ConfigurationIntent {
  constructor(
    private readonly description: string,
    private readonly impact: 'LOW' | 'MEDIUM' | 'HIGH'
  ) {
    if (!description) throw new Error('Configuration description is required');
  }

  public getDescription(): string { return this.description; }
  public getImpact(): string { return this.impact; }
}
