import { PrismaClient } from '@prisma/client';
import { PrismaIdentityRepository } from '../packages/infrastructure/src/identity/PrismaIdentityRepository';
import { ResendVerificationUseCase } from '../packages/application/src/identity/use-cases/ResendVerificationUseCase';
import { PrismaEmailVerificationTokenRepository } from '../packages/infrastructure/src/identity/PrismaEmailVerificationTokenRepository';
import { CapturedEmailDeliveryGateway } from '../packages/infrastructure/src/identity/CapturedEmailDeliveryGateway';

async function main() {
  const prisma = new PrismaClient();
  const identityRepository = new PrismaIdentityRepository(prisma);
  
  // Let's resolve or construct the token repo and email gateway
  const tokenRepository = new PrismaEmailVerificationTokenRepository(prisma);
  const emailDeliveryGateway = new CapturedEmailDeliveryGateway();
  
  const useCase = new ResendVerificationUseCase(
    identityRepository,
    tokenRepository,
    emailDeliveryGateway
  );
  
  const email = 'wegdangamil2022@gmail.com';
  console.log(`[Diagnostic] Executing ResendVerificationUseCase for: ${email}`);
  
  try {
    const result = await useCase.execute({ email });
    console.log('[Diagnostic] ResendVerificationUseCase output:', result);
  } catch (err: any) {
    console.error('[Diagnostic] ResendVerificationUseCase THREW EXCEPTION:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
