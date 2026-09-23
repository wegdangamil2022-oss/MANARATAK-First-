import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { IIdentityRepository, IPasswordResetTokenRepository, IEmailDeliveryGateway } from '@manaratak/domain';

export interface ForgotPasswordInput {
  primaryEmail?: string;
  email?: string;
}

export interface ForgotPasswordOutput {
  success: boolean;
  message: string;
}

export interface ForgotPasswordUseCaseDependencies {
  identityRepository: IIdentityRepository;
  tokenRepository: IPasswordResetTokenRepository;
  emailDeliveryGateway: IEmailDeliveryGateway;
}

export class ForgotPasswordUseCase {
  private readonly identityRepository: IIdentityRepository;
  private readonly tokenRepository: IPasswordResetTokenRepository;
  private readonly emailDeliveryGateway: IEmailDeliveryGateway;

  constructor(dependencies: ForgotPasswordUseCaseDependencies) {
    this.identityRepository = dependencies.identityRepository;
    this.tokenRepository = dependencies.tokenRepository;
    this.emailDeliveryGateway = dependencies.emailDeliveryGateway;
  }

  public async execute(input: ForgotPasswordInput): Promise<ForgotPasswordOutput> {
    // Uniform generic message to prevent account enumeration
    const genericResponse: ForgotPasswordOutput = {
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    };

    const rawEmail = (input.primaryEmail || input.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      return genericResponse;
    }

    const identity = await this.identityRepository.findByEmail(rawEmail);
    if (!identity || !identity.user) {
      return genericResponse;
    }

    // Invalidate/replace all prior pending password reset tokens for this identity
    await this.tokenRepository.invalidatePendingForIdentity(identity.id.toString());

    // Generate cryptographically secure random token (CSPRNG)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    // TTL: 1 hour (3600 seconds)
    const ttlMs = 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.tokenRepository.save({
      id: randomUUID(),
      identityId: identity.id.toString(),
      tokenHash,
      email: rawEmail,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    });

    // Deliver reset email with rawToken only (token hash is never revealed to the user)
    await this.emailDeliveryGateway.sendPasswordResetEmail({
      email: rawEmail,
      token: rawToken,
      displayName: identity.user.profile?.props?.displayName || 'User',
    });

    return genericResponse;
  }
}
