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

    const workspaces = await prisma.studentWorkspace.findMany();
    console.log(`\nFound ${workspaces.length} StudentWorkspace records:`);
    for (const w of workspaces) {
      console.log(`- Reference ID: ${w.studentReferenceId}, Status: ${w.status}, Version: ${w.version}`);
    }

    const studentEmails = ['wegdangamil2022@gmail.com', 'wgdangameel1234@gmail.com'];
    for (const email of studentEmails) {
      const iden = await prisma.identityRecord.findFirst({
        where: { user: { primaryEmail: email } },
        include: { user: true }
      });
      if (iden) {
        console.log(`\nChecking student workspace for ${email} (Identity ID: ${iden.id})...`);
        const workspace = await prisma.studentWorkspace.findUnique({
          where: { studentReferenceId: iden.id }
        });
        if (workspace) {
          console.log(`Workspace found:`, JSON.stringify(workspace, null, 2));
        } else {
          console.log(`NO workspace record found for Identity ID: ${iden.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error querying StudentWorkspace records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
