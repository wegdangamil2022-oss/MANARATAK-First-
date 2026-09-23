import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  IIdentityRepository,
  IEmailVerificationTokenRepository,
  IEmailDeliveryGateway,
  LifeStatus,
} from '@manaratak/domain';

export interface ResendVerificationInput {
  email: string;
}

export interface ResendVerificationOutput {
  success: boolean;
  message: string;
}

export class ResendVerificationUseCase {
  constructor(
    private readonly identityRepository: IIdentityRepository,
    private readonly tokenRepository: IEmailVerificationTokenRepository,
    private readonly emailDeliveryGateway: IEmailDeliveryGateway,
  ) {}

  public async execute(input: ResendVerificationInput): Promise<ResendVerificationOutput> {
    const genericResponse: ResendVerificationOutput = {
      success: true,
      message: 'If this account requires verification, a new verification email has been sent.',
    };

    const normalizedEmail = (input.email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return genericResponse;
    }

    const identity = await this.identityRepository.findByEmail(normalizedEmail);
    if (!identity || !identity.user) {
      // Avoid account enumeration
      return genericResponse;
    }

    // If already active and verified, do not send another token
    if (identity.status === LifeStatus.ACTIVE && identity.user.contactRegistry.isEmailVerified) {
      return genericResponse;
    }

    // Invalidate prior active tokens for this identity
    await this.tokenRepository.invalidatePendingForIdentity(identity.id.toString());

    // Generate fresh cryptographically secure token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.tokenRepository.save({
      id: randomUUID(),
      identityId: identity.id.toString(),
      tokenHash,
      email: normalizedEmail,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    });

    await this.emailDeliveryGateway.sendVerificationEmail({
      email: normalizedEmail,
      token: rawToken,
      displayName: identity.user.profile.props.displayName,
    });

    return genericResponse;
  }
}
