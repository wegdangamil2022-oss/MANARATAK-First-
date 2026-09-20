import { CacheEntryId } from '../value-objects/CacheEntryId';
import { CacheReference } from '../value-objects/CacheReference';

export class CacheEntryExpiredEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly cacheEntryId: CacheEntryId,
    public readonly cacheReference: CacheReference
  ) {}
}
