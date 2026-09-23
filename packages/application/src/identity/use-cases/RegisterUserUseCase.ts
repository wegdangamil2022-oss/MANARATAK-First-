import { createHash, randomBytes, randomUUID, scrypt } from 'node:crypto';
import {
  Account,
  ContactRegistry,
  Identity,
  IdentityType,
  IIdentityRepository,
  IRoleAssignmentRepository,
  LifeStatus,
  Profile,
  RoleAssignment,
  TechnicalMetadata,
  User,
  IEmailVerificationTokenRepository,
  IEmailDeliveryGateway,
} from '@manaratak/domain';
import { IPasswordHasher } from '@manaratak/core';

export interface RegisterUserInput {
  displayName: string;
  primaryEmail: string;
  password: string;
  preferredLanguage?: string;
}

export interface RegisterUserOutput {
  identityId: string;
  email: string;
  status: LifeStatus;
  isEmailVerified: boolean;
}

export interface RegisterUserDependencies {
  identityRepository: IIdentityRepository;
  tokenRepository: IEmailVerificationTokenRepository;
  emailDeliveryGateway: IEmailDeliveryGateway;
  passwordHasher?: IPasswordHasher | { hash(password: string): Promise<string> };
  roleAssignmentRepository?: IRoleAssignmentRepository;
  prismaClient?: any;
}

export class RegisterUserUseCase {
  constructor(private readonly dependencies: RegisterUserDependencies) {}

  public async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const displayName = (input.displayName || '').trim();
    const normalizedEmail = (input.primaryEmail || '').trim().toLowerCase();
    const password = input.password || '';

    if (!displayName) {
      throw new Error('Display name is required');
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid primary email is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // 1. Check for existing identity with this email
    const existing = await this.dependencies.identityRepository.findByEmail(normalizedEmail);
    if (existing) {
      const error: any = new Error('An account with this email address already exists');
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    // 2. Hash password securely using timing-safe scrypt or injected hasher
    let passwordHash: string;
    if (this.dependencies.passwordHasher?.hash) {
      passwordHash = await this.dependencies.passwordHasher.hash(password);
    } else {
      const salt = randomBytes(16);
      const derivedKey = await new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
          if (err) reject(err);
          else resolve(key as Buffer);
        });
      });
      passwordHash = `scrypt:16384:8:1:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
    }

    // 3. Assemble domain entities
    const profile = new Profile({
      displayName,
      preferredLanguage: input.preferredLanguage || 'ar',
      timeZone: 'Asia/Aden',
    });

    const contactRegistry = new ContactRegistry({
      primaryEmail: normalizedEmail,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    const user = new User({ profile, contactRegistry });
    const technicalMetadata = TechnicalMetadata.create('public-registration');

    const identityId = randomUUID();
    const account = new Account({
      identityId,
      accessState: 'Active',
      storageQuotaBytes: 5 * 1024 * 1024 * 1024,
      rateLimitMax: 100,
      rateLimitWindowMs: 60_000,
    });

    const identity = new Identity({
      type: IdentityType.Human,
      status: LifeStatus.PROVISIONED,
      user,
      account,
      technicalMetadata,
    });

    // 4. Generate cryptographically secure verification token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const tokenId = randomUUID();

    // 5. Atomic persistence: If Prisma client is available, execute in transaction
    const prisma = this.dependencies.prismaClient;
    if (prisma?.$transaction) {
      await prisma.$transaction(async (tx: any) => {
        // Save identity via delegate
        const identityDelegate = tx.identityRecord || tx;
        await identityDelegate.create({
          data: {
            id: identityId,
            type: identity.type,
            status: identity.status,
            createdBy: 'public-registration',
            createdAt: new Date(),
            version: 1,
            user: {
              create: {
                displayName,
                preferredLanguage: input.preferredLanguage || 'ar',
                timeZone: 'Asia/Aden',
                primaryEmail: normalizedEmail,
                isEmailVerified: false,
                isPhoneVerified: false,
              },
            },
            account: {
              create: {
                accessState: 'Active',
                storageQuotaBytes: 5 * 1024 * 1024 * 1024,
                rateLimitMax: 100,
                rateLimitWindowMs: 60_000,
              },
            },
          },
        });

        // Save credential
        const credDelegate = tx.credentialRecord || tx;
        if (credDelegate?.create) {
          await credDelegate.create({
            data: {
              identityId,
              type: 'password',
              passwordHash,
              disabled: false,
            },
          });
        }

        // Save verification token
        const tokenDelegate = tx.emailVerificationTokenRecord || tx;
        if (tokenDelegate?.create) {
          await tokenDelegate.create({
            data: {
              id: tokenId,
              identityId,
              tokenHash,
              email: normalizedEmail,
              expiresAt,
              createdAt: new Date(),
            },
          });
        }

        // Assign student role if table exists
        if (tx.roleAssignmentRecord?.create) {
          await tx.roleAssignmentRecord.create({
            data: {
              id: randomUUID(),
              identityId,
              roleId: 'student',
              assignedAt: new Date(),
            },
          });
        }
      });
    } else {
      // Repository-based persistence (in-memory or non-transactional test environments)
      await this.dependencies.identityRepository.save(identity);

      if (prisma?.credentialRecord?.create) {
        await prisma.credentialRecord.create({
          data: {
            identityId: identity.id.toString(),
            type: 'password',
            passwordHash,
            disabled: false,
          },
        });
      }

      await this.dependencies.tokenRepository.save({
        id: tokenId,
        identityId: identity.id.toString(),
        tokenHash,
        email: normalizedEmail,
        expiresAt,
        consumedAt: null,
        createdAt: new Date(),
      });

      if (this.dependencies.roleAssignmentRepository) {
        const assignment = new RoleAssignment({
          id: randomUUID(),
          identityId: identity.id.toString(),
          roleId: 'student',
          assignedAt: new Date(),
        });
        await this.dependencies.roleAssignmentRepository.save(assignment);
      }
    }

    // 6. Deliver verification email (mock/captured boundary)
    await this.dependencies.emailDeliveryGateway.sendVerificationEmail({
      email: normalizedEmail,
      token: rawToken,
      displayName,
    });

    return {
      identityId: identity.id.toString(),
      email: normalizedEmail,
      status: identity.status,
      isEmailVerified: false,
    };
  }
}
