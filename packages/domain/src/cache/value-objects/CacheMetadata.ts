import { CacheExpirationMetadata } from './CacheExpirationMetadata';
import { CacheInvalidationMetadata } from './CacheInvalidationMetadata';
import { CacheOwnershipMetadata } from './CacheOwnershipMetadata';
import { CachePolicy } from './CachePolicy';

export class CacheMetadata {
  private constructor(
    private readonly expiration: CacheExpirationMetadata,
    private readonly invalidation: CacheInvalidationMetadata,
    private readonly ownership: CacheOwnershipMetadata,
    private readonly policy: CachePolicy
  ) {}

  public static create(
    expiration: CacheExpirationMetadata,
    invalidation: CacheInvalidationMetadata,
    ownership: CacheOwnershipMetadata,
    policy: CachePolicy
  ): CacheMetadata {
    return new CacheMetadata(expiration, invalidation, ownership, policy);
  }

  public getExpiration(): CacheExpirationMetadata {
    return this.expiration;
  }

  public getInvalidation(): CacheInvalidationMetadata {
    return this.invalidation;
  }

  public getOwnership(): CacheOwnershipMetadata {
    return this.ownership;
  }

  public getPolicy(): CachePolicy {
    return this.policy;
  }
}
