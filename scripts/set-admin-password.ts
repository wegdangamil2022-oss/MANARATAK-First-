import { PrismaClient } from '@prisma/client';
import { PasswordHasher } from '../packages/infrastructure/dist/auth/PasswordHasher.js';

// Reconstruct DATABASE_URL for Prisma to use PostgreSQL via direct socket or host
const host = encodeURIComponent(process.env.SQL_HOST || '');
const db = encodeURIComponent(process.env.SQL_DB_NAME || '');
const user = process.env.SQL_USER || '';
const pass = encodeURIComponent(process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '');
process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

const prisma = new PrismaClient();

async function main() {
  const email = 'wegdangamil2022@gmail.com';
  const newPassword = 'wegdan1234@1234';

  console.log(`[Credential Sync] Hashing new password for ${email}...`);
  const passwordHash = await PasswordHasher.hash(newPassword);

  const userRecord = await prisma.userRecord.findUnique({
    where: { primaryEmail: email },
  });

  if (!userRecord) {
    console.error(`[Credential Sync] User ${email} not found!`);
    return;
  }

  const identityId = userRecord.identityId;
  console.log(`[Credential Sync] User identityId: ${identityId}`);

  // Idempotently update or create the password credential
  const credential = await prisma.credentialRecord.findFirst({
    where: { identityId, type: 'password' },
  });

  if (credential) {
    await prisma.credentialRecord.update({
      where: { id: credential.id },
      data: { passwordHash },
    });
    console.log(`[Credential Sync] Successfully updated password credential in DB for ${email}.`);
  } else {
    await prisma.credentialRecord.create({
      data: {
        identityId,
        type: 'password',
        passwordHash,
      },
    });
    console.log(`[Credential Sync] Successfully created password credential in DB for ${email}.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
