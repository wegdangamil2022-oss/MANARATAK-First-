export enum ConfigurationScope {
  SYSTEM = 'SYSTEM',
  APPLICATION = 'APPLICATION',
  FEATURE = 'FEATURE',
  INFRASTRUCTURE = 'INFRASTRUCTURE'
}

export class ConfigurationClassification {
  constructor(private readonly scope: ConfigurationScope) {}
  public getScope(): ConfigurationScope { return this.scope; }
}
