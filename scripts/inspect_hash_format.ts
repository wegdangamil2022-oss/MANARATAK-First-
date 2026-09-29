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
    console.log('Successfully connected.');

    const userEmails = ['wegdangamil2022@gmail.com', 'wgdangameel1234@gmail.com'];
    for (const email of userEmails) {
      const iden = await prisma.identityRecord.findFirst({
        where: { user: { primaryEmail: email } },
        include: { credentials: true }
      });
      if (iden) {
        console.log(`\n--- User: ${email} (Identity: ${iden.id}) ---`);
        for (const cred of iden.credentials) {
          console.log(`Credential ID: ${cred.id}`);
          console.log(`Type: ${cred.type}`);
          console.log(`Disabled: ${cred.disabled}`);
          if (cred.passwordHash) {
            const hasScrypt = cred.passwordHash.startsWith('scrypt:');
            const length = cred.passwordHash.length;
            const parts = cred.passwordHash.split(':');
            console.log(`Password Hash starts with 'scrypt:': ${hasScrypt}`);
            console.log(`Length of hash string: ${length}`);
            console.log(`Number of colon-separated parts: ${parts.length}`);
            if (parts.length > 0) {
              console.log(`Parts preview (lengths or empty):`, parts.map((p, i) => `part ${i}: length ${p.length}`));
            }
          } else {
            console.log(`Password hash is null or empty.`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error during database inspection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
