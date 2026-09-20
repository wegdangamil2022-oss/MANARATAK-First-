export class ConfigurationVersion {
  constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number
  ) {}

  public getValue(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  public static initial(): ConfigurationVersion {
    return new ConfigurationVersion(1, 0, 0);
  }

  public nextPatch(): ConfigurationVersion {
    return new ConfigurationVersion(this.major, this.minor, this.patch + 1);
  }

  public nextMinor(): ConfigurationVersion {
    return new ConfigurationVersion(this.major, this.minor + 1, 0);
  }

  public nextMajor(): ConfigurationVersion {
    return new ConfigurationVersion(this.major + 1, 0, 0);
  }
}
