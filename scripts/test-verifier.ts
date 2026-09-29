import { PrismaClient } from '@prisma/client';
import { PrismaCredentialVerifier } from '../packages/infrastructure/src/auth/PrismaCredentialVerifier';
import { PasswordHasher } from '../packages/infrastructure/src/auth/PasswordHasher';

async function main() {
  const prisma = new PrismaClient();
  const verifier = new PrismaCredentialVerifier(prisma);
  const email = 'wegdangamil2022@gmail.com';
  
  try {
    const user = await prisma.userRecord.findUnique({
      where: { primaryEmail: email }
    });
    if (!user) {
      console.log('User not found in DB');
      return;
    }
    
    console.log(`[Diagnostic] User ID: ${user.identityId}`);
    
    // Now let's run the steps of PrismaCredentialVerifier manually and log details/errors!
    const identity = await prisma.identityRecord.findUnique({
      where: { id: user.identityId },
      include: {
        account: true,
        user: true,
        credentials: {
          where: {
            type: 'password',
            disabled: false
          }
        }
      }
    });
    
    if (!identity) {
      console.log('[Diagnostic] Identity lookup returned null!');
      return;
    }
    
    console.log('[Diagnostic] Identity fields:', {
      id: identity.id,
      status: identity.status,
      hasAccount: !!identity.account,
      accountState: identity.account?.accessState,
      isEmailVerified: identity.user?.isEmailVerified,
      credentialsCount: identity.credentials?.length,
    });
    
    const credential = identity.credentials?.[0];
    if (credential) {
      console.log('[Diagnostic] Credential fields:', {
        id: credential.id,
        type: credential.type,
        disabled: credential.disabled,
        hasHash: !!credential.passwordHash,
      });
      
      // Let's test PasswordHasher.verify with a dummy password and print out any errors
      try {
        console.log('[Diagnostic] Testing PasswordHasher.verify with dummy...');
        const result = await PasswordHasher.verify('any_password_here', credential.passwordHash);
        console.log(`[Diagnostic] PasswordHasher.verify result: ${result}`);
      } catch (err: any) {
        console.error('[Diagnostic] PasswordHasher.verify THREW ERROR:', err);
      }
    }
    
  } catch (err: any) {
    console.error('[Diagnostic] Diagnostic script error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
