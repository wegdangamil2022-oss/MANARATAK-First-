import { IPasswordResetTokenRepository, PasswordResetTokenRecord } from '@manaratak/domain';

export class InMemoryPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  private readonly tokens = new Map<string, PasswordResetTokenRecord>();

  public async save(record: PasswordResetTokenRecord): Promise<void> {
    this.tokens.set(record.id, { ...record });
  }

  public async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    for (const record of this.tokens.values()) {
      if (record.tokenHash === tokenHash) {
        return { ...record };
      }
    }
    return null;
  }

  public async consume(id: string, consumedAt = new Date()): Promise<void> {
    const record = this.tokens.get(id);
    if (record) {
      record.consumedAt = consumedAt;
    }
  }

  public async invalidatePendingForIdentity(identityId: string): Promise<void> {
    const now = new Date();
    for (const record of this.tokens.values()) {
      if (record.identityId === identityId && !record.consumedAt) {
        record.consumedAt = now;
      }
    }
  }

  public clear(): void {
    this.tokens.clear();
  }
}
