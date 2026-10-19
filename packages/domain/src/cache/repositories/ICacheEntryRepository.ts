import { CacheEntry } from '../aggregates/CacheEntry';
import { ISpecification } from '@absheer/core';

export interface ICacheEntryRepository {
  save(entry: CacheEntry): Promise<void>;
  findBy(specification: ISpecification<CacheEntry>): Promise<CacheEntry[]>;
  remove(entry: CacheEntry): Promise<void>;
}
