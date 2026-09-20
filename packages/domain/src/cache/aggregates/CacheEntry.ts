import { CacheEntryId } from '../value-objects/CacheEntryId';
import { CacheReference } from '../value-objects/CacheReference';
import { CacheScope } from '../value-objects/CacheScope';
import { CacheKey } from '../value-objects/CacheKey';
import { CacheMetadata } from '../value-objects/CacheMetadata';
import { CacheEntryStatus } from '../enums/CacheEntryStatus';
import { CacheEntryCreatedEvent } from '../events/CacheEntryCreatedEvent';
import { CacheEntryExpiredEvent } from '../events/CacheEntryExpiredEvent';
import { CacheEntryInvalidatedEvent } from '../events/CacheEntryInvalidatedEvent';
import { CacheEntryRemovedEvent } from '../events/CacheEntryRemovedEvent';

export class CacheEntry {
  private status: CacheEntryStatus;
  private readonly events: any[] = [];
  private readonly createdAt: Date;

  private constructor(
    private readonly id: CacheEntryId,
    private readonly reference: CacheReference,
    private readonly scope: CacheScope,
    private readonly key: CacheKey,
    private readonly metadata: CacheMetadata
  ) {
    this.status = CacheEntryStatus.CREATED;
    this.createdAt = new Date();
  }

  public static create(
    id: CacheEntryId,
    reference: CacheReference,
    scope: CacheScope,
    key: CacheKey,
    metadata: CacheMetadata
  ): CacheEntry {
    const entry = new CacheEntry(id, reference, scope, key, metadata);
    entry.addEvent(new CacheEntryCreatedEvent(id, reference, scope, key));
    return entry;
  }

  public getId(): CacheEntryId {
    return this.id;
  }

  public getReference(): CacheReference {
    return this.reference;
  }

  public getScope(): CacheScope {
    return this.scope;
  }

  public getKey(): CacheKey {
    return this.key;
  }

  public getMetadata(): CacheMetadata {
    return this.metadata;
  }

  public getStatus(): CacheEntryStatus {
    return this.status;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public expire(): void {
    if (this.status !== CacheEntryStatus.EXPIRED) {
      this.status = CacheEntryStatus.EXPIRED;
      this.addEvent(new CacheEntryExpiredEvent(this.id, this.reference));
    }
  }

  public invalidate(): void {
    if (this.status !== CacheEntryStatus.INVALIDATED) {
      this.status = CacheEntryStatus.INVALIDATED;
      this.addEvent(new CacheEntryInvalidatedEvent(this.id, this.reference));
    }
  }

  public remove(): void {
    if (this.status !== CacheEntryStatus.REMOVED) {
      this.status = CacheEntryStatus.REMOVED;
      this.addEvent(new CacheEntryRemovedEvent(this.id, this.reference));
    }
  }

  public getEvents(): ReadonlyArray<any> {
    return Object.freeze([...this.events]);
  }

  public clearEvents(): void {
    this.events.length = 0;
  }

  private addEvent(event: any): void {
    this.events.push(event);
  }
}
