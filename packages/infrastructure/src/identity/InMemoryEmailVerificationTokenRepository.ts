import { IEmailVerificationTokenRepository, EmailVerificationTokenRecord } from '@manaratak/domain';

export class InMemoryEmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  private readonly tokens = new Map<string, EmailVerificationTokenRecord>();

  public async save(record: EmailVerificationTokenRecord): Promise<void> {
    this.tokens.set(record.id, { ...record });
  }

  public async findByTokenHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null> {
    for (const record of this.tokens.values()) {
      if (record.tokenHash === tokenHash) {
        return { ...record };
      }
    }
    return null;
  }

  public async consume(id: string, consumedAt = new Date()): Promise<void> {
    const existing = this.tokens.get(id);
    if (existing) {
      existing.consumedAt = consumedAt;
      this.tokens.set(id, existing);
    }
  }

  public async invalidatePendingForIdentity(identityId: string): Promise<void> {
    for (const [id, record] of this.tokens.entries()) {
      if (record.identityId === identityId && !record.consumedAt) {
        record.consumedAt = new Date();
        this.tokens.set(id, record);
      }
    }
  }

  public clear(): void {
    this.tokens.clear();
  }
}
