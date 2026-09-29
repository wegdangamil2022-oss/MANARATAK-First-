import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = 'wegdangamil2022@gmail.com';
    console.log(`[Inspection] Searching for user: ${email}`);
    
    const user = await prisma.userRecord.findUnique({
      where: { primaryEmail: email },
      include: {
        identity: {
          include: {
            credentials: true,
            roleAssignments: true,
            emailVerificationTokens: true,
            account: true,
          }
        }
      }
    });

    if (!user) {
      console.log(`[Inspection] USER_NOT_FOUND: No UserRecord with email ${email}`);
      return;
    }

    console.log('[Inspection] User found:');
    console.log(JSON.stringify({
      identityId: user.identityId,
      displayName: user.displayName,
      primaryEmail: user.primaryEmail,
      isEmailVerified: user.isEmailVerified,
      identityStatus: user.identity.status,
      identityType: user.identity.type,
      account: user.identity.account,
      credentialsCount: user.identity.credentials.length,
      credentials: user.identity.credentials.map(c => ({
        id: c.id,
        type: c.type,
        disabled: c.disabled,
        hasPasswordHash: !!c.passwordHash,
      })),
      roles: user.identity.roleAssignments.map(r => r.roleId),
      tokensCount: user.identity.emailVerificationTokens.length,
      tokens: user.identity.emailVerificationTokens.map(t => ({
        id: t.id,
        email: t.email,
        expiresAt: t.expiresAt,
        consumedAt: t.consumedAt,
      })),
    }, null, 2));

  } catch (err) {
    console.error('[Inspection] Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
