import { PrismaClient } from '@prisma/client';
import { PasswordHasher } from '../packages/infrastructure/src/auth/PasswordHasher';
import { LifeStatus } from '../packages/domain/src/enums/LifeStatus';
import { AccountAccessState } from '../packages/domain/src/entities/Account';
import * as dotenv from 'dotenv';

// Load environmental configuration
dotenv.config();

/**
 * --- ADMIN BOOTSTRAP SCRIPT ---
 * 
 * Purpose: Safe, idempotent CLI bootstrap tool for provisioning or updating
 * administrative accounts in development, test, and remediation environments.
 * 
 * Security:
 * - Unconditionally prohibited in PRODUCTION/STAGING environments.
 * - Suppresses logging of plaintext passwords, tokens, or credentials.
 * - Passwords are securely hashed using timing-safe scrypt KDF before database persistence.
 */
async function main() {
  const isProductionLike = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

  if (isProductionLike) {
    console.error('[BOOTSTRAP ERROR] Administrative bootstrap is disabled in production and staging.');
    process.exit(1);
  }

  const bootstrapId = process.env.ADMIN_BOOTSTRAP_ID || 'admin-root';
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@manaratak.org';
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!bootstrapPassword) {
    console.error('[BOOTSTRAP ERROR] ADMIN_BOOTSTRAP_PASSWORD is not defined in the environment.');
    console.error('Please configure ADMIN_BOOTSTRAP_PASSWORD with a secure password to run this tool.');
    process.exit(1);
  }

  let dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl || dbUrl.includes('postgres-host') || dbUrl.includes('placeholder')) {
    const { SQL_ADMIN_USER, SQL_ADMIN_PASSWORD, SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD } = process.env;
    if (SQL_ADMIN_USER && SQL_ADMIN_PASSWORD && SQL_HOST && SQL_DB_NAME) {
      const encodedPassword = encodeURIComponent(SQL_ADMIN_PASSWORD);
      dbUrl = `postgresql://${SQL_ADMIN_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    } else if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
      const encodedPassword = encodeURIComponent(SQL_PASSWORD);
      dbUrl = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    }
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  console.log('[BOOTSTRAP] Initiating idempotent administrative bootstrap.');

  try {
    // Hash password securely via timing-safe scrypt
    const passwordHash = await PasswordHasher.hash(bootstrapPassword);
    const normalizedEmail = bootstrapEmail.trim().toLowerCase();

    // 1. Search for existing user record by email (case insensitive) or identity by ID
    const existingUser = await prisma.userRecord.findFirst({
      where: {
        primaryEmail: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });

    const targetIdentityId = existingUser ? existingUser.identityId : bootstrapId;

    const existingIdentity = await prisma.identityRecord.findUnique({
      where: { id: targetIdentityId },
      include: {
        user: true,
        credentials: {
          where: { type: 'password' },
        },
      },
    });

    if (existingIdentity) {
      console.log('[BOOTSTRAP] Existing identity found. Synchronizing credentials, profile, and status.');

      // Idempotently update life status
      await prisma.identityRecord.update({
        where: { id: targetIdentityId },
        data: {
          status: LifeStatus.PROVISIONED,
        },
      });

      // Idempotently update user record
      await prisma.userRecord.upsert({
        where: { identityId: targetIdentityId },
        create: {
          identityId: targetIdentityId,
          displayName: 'Project Owner',
          primaryEmail: bootstrapEmail,
          isEmailVerified: true,
          isPhoneVerified: false,
        },
        update: {
          primaryEmail: bootstrapEmail,
          isEmailVerified: true,
        },
      });

      // Idempotently update or create the password credential
      const passwordCredential = existingIdentity.credentials?.[0];
      if (passwordCredential) {
        await prisma.credentialRecord.update({
          where: { id: passwordCredential.id },
          data: {
            passwordHash,
            disabled: false,
          },
        });
      } else {
        await prisma.credentialRecord.create({
          data: {
            identityId: targetIdentityId,
            type: 'password',
            passwordHash,
            disabled: false,
          },
        });
      }

      // Idempotently update Account access state
      await prisma.accountRecord.upsert({
        where: { identityId: targetIdentityId },
        create: {
          identityId: targetIdentityId,
          accessState: AccountAccessState.ACTIVE,
          storageQuotaBytes: 10 * 1024 * 1024 * 1024,
          rateLimitMax: 1000,
          rateLimitWindowMs: 60000,
        },
        update: {
          accessState: AccountAccessState.ACTIVE,
        },
      });

      // Idempotently create/update Administrator role record
      await prisma.roleRecord.upsert({
        where: { id: 'administrator' },
        create: {
          id: 'administrator',
          name: 'Administrator',
          description: 'Full administrative authority',
          permissions: ['admin:*'],
          policyIds: [],
        },
        update: {
          permissions: ['admin:*'],
        },
      });

      // Idempotently assign role
      const existingAssignment = await prisma.roleAssignmentRecord.findFirst({
        where: {
          identityId: targetIdentityId,
          roleId: 'administrator',
        },
      });

      if (!existingAssignment) {
        await prisma.roleAssignmentRecord.create({
          data: {
            id: `assign-admin-role-${targetIdentityId}`,
            identityId: targetIdentityId,
            roleId: 'administrator',
          },
        });
      }

      console.log('[BOOTSTRAP SUCCESS] Administrative account updated and verified.');
    } else {
      console.log('[BOOTSTRAP] No existing identity found. Provisioning a new administrative profile.');

      // Create new identity, user profile, account, and credential record atomically
      await prisma.identityRecord.create({
        data: {
          id: targetIdentityId,
          status: LifeStatus.PROVISIONED,
          type: 'Human',
          createdBy: 'system',
          account: {
            create: {
              accessState: AccountAccessState.ACTIVE,
              storageQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
              rateLimitMax: 1000,
              rateLimitWindowMs: 60000,
            },
          },
          user: {
            create: {
              displayName: 'Project Owner',
              primaryEmail: bootstrapEmail,
              isEmailVerified: true,
              isPhoneVerified: false,
            },
          },
          credentials: {
            create: {
              type: 'password',
              passwordHash,
              disabled: false,
            },
          },
        },
      });

      // Idempotently create/update Administrator role record
      await prisma.roleRecord.upsert({
        where: { id: 'administrator' },
        create: {
          id: 'administrator',
          name: 'Administrator',
          description: 'Full administrative authority',
          permissions: ['admin:*'],
          policyIds: [],
        },
        update: {
          permissions: ['admin:*'],
        },
      });

      // Assign role
      await prisma.roleAssignmentRecord.create({
        data: {
          id: `assign-admin-role-${targetIdentityId}`,
          identityId: targetIdentityId,
          roleId: 'administrator',
        },
      });

      console.log('[BOOTSTRAP SUCCESS] Administrative account provisioned.');
    }
  } catch (error: any) {
    console.error('[BOOTSTRAP FAILURE] An error occurred during administrative bootstrap:');
    if (error?.message && error.message.includes('Can\'t reach database server')) {
      console.error('>> Database server is unreachable. Verify your DATABASE_URL configuration.');
    } else console.error('>> Bootstrap failed. Consult restricted server logs using the request correlation context.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('[BOOTSTRAP FATAL ERROR] Administrative bootstrap terminated safely.');
  process.exit(1);
});
