export interface EmailVerificationTokenRecord {
  id: string;
  identityId: string;
  tokenHash: string;
  email: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface IEmailVerificationTokenRepository {
  save(record: EmailVerificationTokenRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null>;
  consume(id: string, consumedAt?: Date): Promise<void>;
  invalidatePendingForIdentity(identityId: string): Promise<void>;
}
