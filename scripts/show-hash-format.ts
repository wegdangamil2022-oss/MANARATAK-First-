import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = 'wegdangamil2022@gmail.com';
    const user = await prisma.userRecord.findUnique({
      where: { primaryEmail: email },
      include: {
        identity: {
          include: {
            credentials: true
          }
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    const cred = user.identity.credentials.find(c => c.type === 'password');
    if (!cred) {
      console.log('No password credential found');
      return;
    }

    console.log('[Diagnostic] Hash Format:', cred.passwordHash);
  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
