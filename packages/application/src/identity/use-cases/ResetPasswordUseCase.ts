import { createHash } from 'node:crypto';
import { IIdentityRepository, IPasswordResetTokenRepository } from '@manaratak/domain';
import { ISessionManager } from '@manaratak/core';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ResetPasswordOutput {
  success: boolean;
  message: string;
}

export interface ResetPasswordUseCaseDependencies {
  identityRepository: IIdentityRepository;
  tokenRepository: IPasswordResetTokenRepository;
  sessionManager?: ISessionManager;
  passwordHasher: { hash(password: string): Promise<string> };
  prismaClient?: any;
}

export class ResetPasswordUseCase {
  private readonly identityRepository: IIdentityRepository;
  private readonly tokenRepository: IPasswordResetTokenRepository;
  private readonly sessionManager?: ISessionManager;
  private readonly passwordHasher: { hash(password: string): Promise<string> };
  private readonly prismaClient?: any;

  constructor(dependencies: ResetPasswordUseCaseDependencies) {
    this.identityRepository = dependencies.identityRepository;
    this.tokenRepository = dependencies.tokenRepository;
    this.sessionManager = dependencies.sessionManager;
    this.passwordHasher = dependencies.passwordHasher;
    this.prismaClient = dependencies.prismaClient;
  }

  public async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const rawToken = (input.token || '').trim();
    const newPassword = input.newPassword || '';

    if (!rawToken) {
      const error: any = new Error('Reset token is required');
      error.code = 'RESET_TOKEN_REQUIRED';
      throw error;
    }

    if (!newPassword || newPassword.length < 8) {
      const error: any = new Error('Password must be at least 8 characters long');
      error.code = 'PASSWORD_TOO_SHORT';
      throw error;
    }

    if (newPassword.length > 128) {
      const error: any = new Error('Password must not exceed 128 characters');
      error.code = 'PASSWORD_TOO_LONG';
      throw error;
    }

    // 1. Hash incoming token with SHA-256
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const tokenRecord = await this.tokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      const error: any = new Error('Invalid or non-existent password reset token');
      error.code = 'RESET_TOKEN_INVALID';
      throw error;
    }

    // 2. Replay protection
    if (tokenRecord.consumedAt) {
      const error: any = new Error('Password reset token has already been used');
      error.code = 'RESET_TOKEN_ALREADY_USED';
      throw error;
    }

    // 3. TTL expiration check
    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      const error: any = new Error('Password reset token has expired');
      error.code = 'RESET_TOKEN_EXPIRED';
      throw error;
    }

    // 4. Identity validation
    const identity = await this.identityRepository.findById(tokenRecord.identityId);
    if (!identity) {
      const error: any = new Error('Identity associated with reset token not found');
      error.code = 'IDENTITY_NOT_FOUND';
      throw error;
    }

    // 5. Hash new password
    const newPasswordHash = await this.passwordHasher.hash(newPassword);
    const now = new Date();

    // 6. Atomic persistence & Session Revocation
    const prisma = this.prismaClient;
    if (prisma?.$transaction) {
      await prisma.$transaction(async (tx: any) => {
        // A. Update Credential
        const credDelegate = tx.credentialRecord || tx;
        if (credDelegate?.updateMany) {
          await credDelegate.updateMany({
            where: { identityId: tokenRecord.identityId, type: 'password' },
            data: { passwordHash: newPasswordHash, disabled: false, updatedAt: now },
          });
        }
        // B. Consume Token
        const tokenDelegate = tx.passwordResetTokenRecord || tx;
        if (tokenDelegate?.update) {
          await tokenDelegate.update({
            where: { id: tokenRecord.id },
            data: { consumedAt: now },
          });
        }
        // C. Revoke Active Sessions
        const sessionDelegate = tx.sessionRecord || tx;
        if (sessionDelegate?.updateMany) {
          await sessionDelegate.updateMany({
            where: { identityId: tokenRecord.identityId, revokedAt: null },
            data: { revokedAt: now },
          });
        }
      });
    } else {
      // In-memory or repository fallback
      await this.tokenRepository.consume(tokenRecord.id, now);
      if (prisma?.credentialRecord?.updateMany) {
        await prisma.credentialRecord.updateMany({
          where: { identityId: tokenRecord.identityId, type: 'password' },
          data: { passwordHash: newPasswordHash, disabled: false, updatedAt: now },
        });
      }
    }

    // Revoke all sessions via SessionManager
    if (this.sessionManager?.revokeAllSessions) {
      await this.sessionManager.revokeAllSessions(tokenRecord.identityId);
    }

    // Strict account lifecycle preservation:
    // - Does NOT mutate identity.status (e.g. PROVISIONED remains PROVISIONED)
    // - Does NOT touch isEmailVerified
    // - Does NOT alter roles or permissions

    return {
      success: true,
      message: 'Password has been successfully reset. Please log in with your new password.',
    };
  }
}
