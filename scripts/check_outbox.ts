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
    console.log('Connected.');

    const outboxCount = await prisma.transactionalOutboxRecord.count();
    console.log(`\nTotal outbox records: ${outboxCount}`);

    const pendingOutbox = await prisma.transactionalOutboxRecord.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    console.log('\nLatest outbox records:');
    for (const r of pendingOutbox) {
      console.log(`- ID: ${r.id}, EventType: ${r.eventType}, Domain: ${r.domain}, State: ${r.state}, Attempts: ${r.attempts}, ProcessedAt: ${r.processedAt}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
