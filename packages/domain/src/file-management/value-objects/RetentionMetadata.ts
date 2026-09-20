import { RetentionCategory } from '../enums/RetentionCategory';

export class RetentionMetadata {
  constructor(
    public readonly category: RetentionCategory,
    public readonly expiresAt?: Date
  ) {}
}
