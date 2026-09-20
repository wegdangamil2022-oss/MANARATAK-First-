import { CacheEntryId } from '../value-objects/CacheEntryId';
import { CacheReference } from '../value-objects/CacheReference';

export class CacheEntryRemovedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly cacheEntryId: CacheEntryId,
    public readonly cacheReference: CacheReference
  ) {}
}
