import { CacheOwnerReference } from './CacheOwnerReference';

export class CacheOwnershipMetadata {
  private constructor(private readonly ownerReference?: CacheOwnerReference) {}

  public static create(ownerReference?: CacheOwnerReference): CacheOwnershipMetadata {
    return new CacheOwnershipMetadata(ownerReference);
  }

  public getOwnerReference(): CacheOwnerReference | undefined {
    return this.ownerReference;
  }
}
