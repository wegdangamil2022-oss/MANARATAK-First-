export class AssetOwnerReference {
  constructor(
    public readonly ownerId: string,
    public readonly ownerType: string
  ) {
    if (!ownerId || ownerId.trim() === '') {
      throw new Error('AssetOwnerReference ownerId cannot be empty');
    }
    if (!ownerType || ownerType.trim() === '') {
      throw new Error('AssetOwnerReference ownerType cannot be empty');
    }
  }
}
