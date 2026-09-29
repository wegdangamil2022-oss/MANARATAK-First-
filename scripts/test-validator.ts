import { PrismaClient } from '@prisma/client';
import { PrismaIdentityRepository } from '../packages/infrastructure/src/students/../identity/PrismaIdentityRepository';
import { IdentityPrincipalAccessValidator } from '../packages/application/src/auth/IdentityPrincipalAccessValidator';
import { LifeStatus, AccountAccessState } from '@manaratak/domain';

async function main() {
  const prisma = new PrismaClient();
  const identityRepo = new PrismaIdentityRepository(prisma);
  const validator = new IdentityPrincipalAccessValidator(identityRepo);
  const email = 'wegdangamil2022@gmail.com';
  
  try {
    const user = await prisma.userRecord.findUnique({
      where: { primaryEmail: email }
    });
    if (!user) {
      console.log('User not found in DB');
      return;
    }
    
    console.log(`[Diagnostic] Principal ID: ${user.identityId}`);
    
    // Test the repository lookup
    const identity = await identityRepo.findById(user.identityId);
    if (!identity) {
      console.log('[Diagnostic] identityRepo.findById returned null!');
      return;
    }
    
    console.log('[Diagnostic] domain identity props:', {
      id: identity.id.toString(),
      status: identity.status,
      hasAccount: !!identity.account,
      accountState: identity.account?.accessState,
      isEmailVerified: identity.user?.contactRegistry.isEmailVerified,
    });
    
    // Evaluate isAuthenticationAllowed
    const allowed = await validator.isAuthenticationAllowed(user.identityId);
    console.log(`[Diagnostic] isAuthenticationAllowed: ${allowed}`);
    
    // Manually run conditions inside isAuthenticationAllowed
    console.log('[Diagnostic] Manual checks:');
    console.log('1. identity.status !== LifeStatus.ACTIVE:', identity.status !== LifeStatus.ACTIVE);
    console.log(`Comparing status: '${identity.status}' with LifeStatus.ACTIVE: '${LifeStatus.ACTIVE}'`);
    console.log('2. identity.account.accessState !== AccountAccessState.ACTIVE:', identity.account.accessState !== AccountAccessState.ACTIVE);
    console.log(`Comparing account state: '${identity.account.accessState}' with AccountAccessState.ACTIVE: '${AccountAccessState.ACTIVE}'`);
    console.log('3. identity.user && !identity.user.contactRegistry.isEmailVerified:', identity.user && !identity.user.contactRegistry.isEmailVerified);
    
  } catch (err: any) {
    console.error('[Diagnostic] Error in test-validator:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
