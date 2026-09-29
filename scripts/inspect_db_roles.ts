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

    // 1. Get all roles
    const roles = await prisma.roleRecord.findMany();
    console.log(`\nFound ${roles.length} roles in the database:`);
    for (const r of roles) {
      console.log(`- Role ID: ${r.id}, Name: ${r.name}, Permissions:`, r.permissions);
    }

    // 2. Get all role assignments
    const assignments = await prisma.roleAssignmentRecord.findMany();
    console.log(`\nFound ${assignments.length} role assignments:`);
    for (const a of assignments) {
      console.log(`- Identity ID: ${a.identityId}, Role ID: ${a.roleId}`);
    }

    // 3. Check for our two active users specifically
    const userEmails = ['wegdangamil2022@gmail.com', 'wgdangameel1234@gmail.com'];
    for (const email of userEmails) {
      const iden = await prisma.identityRecord.findFirst({
        where: { user: { primaryEmail: email } },
        include: { user: true }
      });
      if (iden) {
        console.log(`\n--- User: ${email} (Identity: ${iden.id}) ---`);
        const userAssignments = await prisma.roleAssignmentRecord.findMany({
          where: { identityId: iden.id }
        });
        console.log(`Assignments:`, userAssignments);
      } else {
        console.log(`\n--- User not found for email: ${email} ---`);
      }
    }

  } catch (error) {
    console.error('Error during database inspection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
