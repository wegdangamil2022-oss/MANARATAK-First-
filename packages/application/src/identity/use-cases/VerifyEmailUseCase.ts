import { createHash } from 'node:crypto';
import {
  IIdentityRepository,
  IEmailVerificationTokenRepository,
  LifeStatus,
} from '@manaratak/domain';

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyEmailOutput {
  success: boolean;
  identityId: string;
  email: string;
  status: LifeStatus;
  isEmailVerified: boolean;
}

export class VerifyEmailUseCase {
  constructor(
    private readonly identityRepository: IIdentityRepository,
    private readonly tokenRepository: IEmailVerificationTokenRepository,
  ) {}

  public async execute(input: VerifyEmailInput): Promise<VerifyEmailOutput> {
    const rawToken = (input.token || '').trim();
    if (!rawToken) {
      const error: any = new Error('Verification token is required');
      error.code = 'VERIFICATION_TOKEN_REQUIRED';
      throw error;
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const tokenRecord = await this.tokenRepository.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      const error: any = new Error('Invalid or non-existent verification token');
      error.code = 'VERIFICATION_TOKEN_INVALID';
      throw error;
    }

    if (tokenRecord.consumedAt) {
      const error: any = new Error('Verification token has already been used');
      error.code = 'VERIFICATION_TOKEN_ALREADY_USED';
      throw error;
    }

    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      const error: any = new Error('Verification token has expired');
      error.code = 'VERIFICATION_TOKEN_EXPIRED';
      throw error;
    }

    const identity = await this.identityRepository.findById(tokenRecord.identityId);
    if (!identity || !identity.user) {
      const error: any = new Error('Identity associated with verification token not found');
      error.code = 'IDENTITY_NOT_FOUND';
      throw error;
    }

    const primaryEmail = identity.user.contactRegistry.primaryEmail.trim().toLowerCase();
    if (primaryEmail !== tokenRecord.email.trim().toLowerCase()) {
      const error: any = new Error('Verification token email does not match identity primary email');
      error.code = 'VERIFICATION_EMAIL_MISMATCH';
      throw error;
    }

    // Mark email as verified on domain entity
    identity.user.contactRegistry.verifyEmail();

    // Transition lifecycle from PROVISIONED to ACTIVE
    identity.activate();

    // Persist activated identity
    await this.identityRepository.save(identity);

    // Consume token to prevent replay
    await this.tokenRepository.consume(tokenRecord.id, new Date());

    return {
      success: true,
      identityId: identity.id.toString(),
      email: primaryEmail,
      status: identity.status,
      isEmailVerified: identity.user.contactRegistry.isEmailVerified,
    };
  }
}
