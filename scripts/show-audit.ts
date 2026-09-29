import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('[Diagnostic] Fetching recent audit records...');
    const records = await prisma.auditRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    console.log('[Diagnostic] Recent Audit Records Table:');
    const table = records.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      targetId: r.targetId,
      actorId: r.actorId,
      result: r.contextMetadata?.result || r.contextMetadata?.httpStatus || 'N/A',
      httpStatus: r.contextMetadata?.httpStatus || 'N/A',
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
