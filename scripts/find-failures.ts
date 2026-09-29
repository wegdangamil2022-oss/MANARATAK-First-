import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('[Diagnostic] Querying all login and resend failures...');
    const records = await prisma.auditRecord.findMany({
      where: {
        targetId: {
          in: ['/api/v1/auth/login', '/api/v1/auth/resend-verification', '/api/v1/auth/csrf-token']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    console.log('[Diagnostic] Login/Resend Audit History:');
    const table = records.map(r => ({
      timestamp: r.timestamp,
      action: r.action,
      targetId: r.targetId,
      result: r.contextMetadata?.result || 'N/A',
      httpStatus: r.contextMetadata?.httpStatus || 'N/A',
      detail: r.contextMetadata?.detail || 'N/A',
      error: r.contextMetadata?.error || 'N/A',
      correlationId: r.correlationReference,
    }));
    console.log(JSON.stringify(table, null, 2));

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
