import { AssetRetentionCategory } from '../enums/AssetRetentionCategory';

export class AssetRetentionMetadata {
  constructor(
    public readonly category: AssetRetentionCategory,
    public readonly expiresAt?: Date | null
  ) {}
}
