import { CacheEntryId } from '../value-objects/CacheEntryId';
import { CacheReference } from '../value-objects/CacheReference';
import { CacheScope } from '../value-objects/CacheScope';
import { CacheKey } from '../value-objects/CacheKey';

export class CacheEntryCreatedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly cacheEntryId: CacheEntryId,
    public readonly cacheReference: CacheReference,
    public readonly scope: CacheScope,
    public readonly key: CacheKey
  ) {}
}
