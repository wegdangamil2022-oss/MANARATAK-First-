import {
  CacheEntry,
  CacheEntryId,
  CacheReference,
  CacheScope,
  CacheKey,
  CacheMetadata,
  CacheExpirationMetadata,
  CacheInvalidationMetadata,
  CacheOwnershipMetadata,
  CacheOwnerReference,
  CachePolicy,
  ICacheEntryRepository,
  CacheEntrySpecification,
  CacheEntryStatus
} from '@manaratak/domain';
import { ICacheExecutionGateway } from '../gateways/ICacheExecutionGateway';
import { AllocateCacheDto, GetCacheDto, InvalidateCacheDto } from '../dtos/CacheDtos';

export class ManageCacheUseCase {
  constructor(
    private readonly cacheRepository: ICacheEntryRepository,
    private readonly cacheExecutionGateway: ICacheExecutionGateway
  ) {}

  public async allocateCache(dto: AllocateCacheDto): Promise<string> {
    const scope = CacheScope.create(dto.scope);
    const key = CacheKey.create(dto.key);
    
    // Check if already exists in metadata to possibly invalidate/overwrite
    const spec = CacheEntrySpecification.byScopeAndKey(scope, key);
    const existingEntries = await this.cacheRepository.findBy(spec);
    for (const entry of existingEntries) {
      if (entry.getStatus() === CacheEntryStatus.CREATED) {
        entry.invalidate();
        await this.cacheRepository.save(entry);
      }
    }

    const id = CacheEntryId.generate();
    const reference = CacheReference.generate();

    const expiration = CacheExpirationMetadata.create(
      dto.ttlSeconds,
      dto.absoluteExpirationTime ? new Date(dto.absoluteExpirationTime) : undefined
    );
    const invalidation = CacheInvalidationMetadata.create(dto.invalidationTokens || []);
    const ownership = CacheOwnershipMetadata.create(
      dto.ownerReference ? CacheOwnerReference.from(dto.ownerReference) : undefined
    );
    const policy = CachePolicy.create(dto.policyTags || []);

    const metadata = CacheMetadata.create(expiration, invalidation, ownership, policy);

    const newEntry = CacheEntry.create(id, reference, scope, key, metadata);

    // Persist logical entry
    await this.cacheRepository.save(newEntry);

    // Persist physical cache
    await this.cacheExecutionGateway.put(scope.getValue(), key.getValue(), dto.payload, dto.ttlSeconds);

    return reference.getValue();
  }

  public async getCache(dto: GetCacheDto): Promise<any | null> {
    const scope = CacheScope.create(dto.scope);
    const key = CacheKey.create(dto.key);

    const spec = CacheEntrySpecification.byScopeAndKey(scope, key);
    const entries = await this.cacheRepository.findBy(spec);
    
    const activeEntry = entries.find(e => e.getStatus() === CacheEntryStatus.CREATED);

    if (!activeEntry) {
      return null;
    }

    // Check logical expiration
    if (activeEntry.getMetadata().getExpiration().isExpired(new Date())) {
      activeEntry.expire();
      await this.cacheRepository.save(activeEntry);
      // Clean up physical
      await this.cacheExecutionGateway.invalidate(scope.getValue(), key.getValue());
      return null;
    }

    // Retrieve physical
    return await this.cacheExecutionGateway.get(scope.getValue(), key.getValue());
  }

  public async invalidateCache(dto: InvalidateCacheDto): Promise<void> {
    const scope = CacheScope.create(dto.scope);
    const key = CacheKey.create(dto.key);

    const spec = CacheEntrySpecification.byScopeAndKey(scope, key);
    const entries = await this.cacheRepository.findBy(spec);

    for (const entry of entries) {
      if (entry.getStatus() === CacheEntryStatus.CREATED) {
        entry.invalidate();
        await this.cacheRepository.save(entry);
      }
    }

    await this.cacheExecutionGateway.invalidate(scope.getValue(), key.getValue());
  }
}
