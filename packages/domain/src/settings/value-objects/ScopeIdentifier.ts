import { ScopeLevel } from '../enums/ScopeLevel';

export class ScopeIdentifier {
  private readonly level: ScopeLevel;
  private readonly scopeId?: string;

  constructor(level: ScopeLevel | string, scopeId?: string) {
    const rawLevel = String(level).trim();
    const normalizedLevel = rawLevel.toUpperCase();

    if (normalizedLevel === 'ORGANIZATION' || normalizedLevel === 'ORG') {
      throw new Error('Scope level Organization is excluded per ADR-027. Use TENANT or DOMAIN scope instead.');
    }

    if (!Object.values(ScopeLevel).includes(normalizedLevel as ScopeLevel)) {
      throw new Error(`Unsupported scope level: ${level}`);
    }

    this.level = normalizedLevel as ScopeLevel;
    if (this.level !== ScopeLevel.GLOBAL && (!scopeId || scopeId.trim() === '')) {
      throw new Error(`ScopeId is required for scope level ${this.level}`);
    }
    this.scopeId = scopeId ? scopeId.trim() : undefined;
  }

  public getLevel(): ScopeLevel {
    return this.level;
  }

  public getScopeId(): string | undefined {
    return this.scopeId;
  }

  public equals(other: ScopeIdentifier): boolean {
    if (!other || !(other instanceof ScopeIdentifier)) return false;
    return this.level === other.getLevel() && this.scopeId === other.getScopeId();
  }
}
