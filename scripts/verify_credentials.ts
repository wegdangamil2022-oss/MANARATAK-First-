import { PrismaClient } from '@prisma/client';
import { PasswordHasher } from '../packages/infrastructure/src/auth/PasswordHasher';

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
    
    // We will test some password patterns from environment or common defaults
    const candidates = [
      'Wegdan1234@1234#',
      'Wegdan1234@1234',
      'Wegdan2022@',
      'Wegdan1234@',
      'Wegdan1234',
      'Wegdan123',
      'wegdangamil2022',
      'wgdangameel1234',
      'Wegdan@123',
      'Wegdan@1234',
    ];

    for (const email of userEmails) {
      const iden = await prisma.identityRecord.findFirst({
        where: { user: { primaryEmail: email } },
        include: { credentials: true }
      });

      if (iden && iden.credentials.length > 0) {
        console.log(`\n--- Checking candidates for ${email} ---`);
        const cred = iden.credentials.find(c => c.type === 'password' && !c.disabled);
        if (cred && cred.passwordHash) {
          let matched = false;
          for (const cand of candidates) {
            const ok = await PasswordHasher.verify(cand, cred.passwordHash);
            if (ok) {
              console.log(`MATCH SUCCESS: Password is '${cand}'`);
              matched = true;
              break;
            }
          }
          if (!matched) {
            console.log('None of the tested candidate passwords matched the stored hash.');
          }
        } else {
          console.log('No active password credential found.');
        }
      }
    }

  } catch (error) {
    console.error('Error during credential verification check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
