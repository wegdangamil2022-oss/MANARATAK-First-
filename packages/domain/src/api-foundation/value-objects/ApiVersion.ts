export class ApiVersion {
  constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number
  ) {
    if (major < 0 || minor < 0 || patch < 0) {
      throw new Error('Version numbers must be non-negative');
    }
  }
  public getMajor(): number {
    return this.major;
  }
  public getMinor(): number {
    return this.minor;
  }
  public getPatch(): number {
    return this.patch;
  }
  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
  public equals(other: ApiVersion): boolean {
    return (
      this.major === other.getMajor() &&
      this.minor === other.getMinor() &&
      this.patch === other.getPatch()
    );
  }
}
