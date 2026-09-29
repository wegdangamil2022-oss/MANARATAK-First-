import { PrismaClient } from '@prisma/client';

async function main() {
  let url = process.env.DATABASE_URL || '';
  if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
    const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = process.env;
    if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
      const encodedPassword = encodeURIComponent(SQL_PASSWORD);
      url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    }
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Successfully connected to database.');

    // Let's find all identity records
    const identities = await prisma.identityRecord.findMany({
      include: {
        user: true,
        account: true,
        credentials: true,
      },
    });

    console.log(`Found ${identities.length} identity records:`);
    for (const iden of identities) {
      console.log('-------------------------------------------');
      console.log(`Identity ID: ${iden.id}`);
      console.log(`Type: ${iden.type}`);
      console.log(`Status: ${iden.status}`);
      console.log(`User Info:`, iden.user ? {
        displayName: iden.user.displayName,
        primaryEmail: iden.user.primaryEmail,
        isEmailVerified: iden.user.isEmailVerified,
      } : 'No user');
      console.log(`Account Info:`, iden.account ? {
        accessState: iden.account.accessState,
      } : 'No account');
      console.log(`Credentials:`, iden.credentials ? iden.credentials.map((c: any) => ({
        id: c.id,
        type: c.type,
        disabled: c.disabled,
        hasPasswordHash: !!c.passwordHash,
      })) : 'No credentials');
    }
    console.log('-------------------------------------------');
  } catch (error) {
    console.error('Error executing database inspection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
