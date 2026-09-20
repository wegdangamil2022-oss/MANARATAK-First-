import { CacheEntry } from '../aggregates/CacheEntry';
import { CacheReference } from '../value-objects/CacheReference';
import { CacheScope } from '../value-objects/CacheScope';
import { CacheKey } from '../value-objects/CacheKey';
import { ISpecification } from '@manaratak/core';

export class CacheEntrySpecification implements ISpecification<CacheEntry> {
  private constructor(
    private readonly reference?: CacheReference,
    private readonly scope?: CacheScope,
    private readonly key?: CacheKey
  ) {}

  public static byReference(reference: CacheReference): CacheEntrySpecification {
    return new CacheEntrySpecification(reference);
  }

  public static byScopeAndKey(scope: CacheScope, key: CacheKey): CacheEntrySpecification {
    return new CacheEntrySpecification(undefined, scope, key);
  }

  public isSatisfiedBy(entry: CacheEntry): boolean {
    if (this.reference && !entry.getReference().equals(this.reference)) {
      return false;
    }
    if (this.scope && !entry.getScope().equals(this.scope)) {
      return false;
    }
    if (this.key && !entry.getKey().equals(this.key)) {
      return false;
    }
    return true;
  }
}
