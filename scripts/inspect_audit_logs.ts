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
    console.log('Connected. Querying latest AuditRecord entries...');

    const audits = await prisma.auditRecord.findMany({
      orderBy: {
        timestamp: 'desc',
      },
      take: 50,
    });

    console.log(`Found ${audits.length} recent audit records:`);
    for (const log of audits) {
      console.log('================================================');
      console.log(`ID: ${log.id}`);
      console.log(`Reference: ${log.reference}`);
      console.log(`Timestamp: ${log.timestamp.toISOString()}`);
      console.log(`Action: ${log.action}`);
      console.log(`Category: ${log.category}`);
      console.log(`Severity: ${log.severity}`);
      console.log(`Actor: ${log.actorType} (ID: ${log.actorId})`);
      console.log(`Target: ${log.targetType} (ID: ${log.targetId})`);
      console.log(`Source: ${log.source}`);
      console.log(`Correlation Ref: ${log.correlationReference}`);
      console.log(`Metadata:`, log.contextMetadata);
    }
    console.log('================================================');

  } catch (error) {
    console.error('Error querying audit records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
