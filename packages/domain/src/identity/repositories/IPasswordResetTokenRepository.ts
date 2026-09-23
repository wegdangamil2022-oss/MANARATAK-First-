export interface PasswordResetTokenRecord {
  id: string;
  identityId: string;
  tokenHash: string;
  email: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface IPasswordResetTokenRepository {
  save(record: PasswordResetTokenRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  consume(id: string, consumedAt?: Date): Promise<void>;
  invalidatePendingForIdentity(identityId: string): Promise<void>;
}
