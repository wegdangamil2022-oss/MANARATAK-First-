import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

async function main() {
  const user = process.env.SQL_USER;
  const pass = encodeURIComponent(process.env.SQL_PASSWORD || '');
  const host = encodeURIComponent(process.env.SQL_HOST || '');
  const db = process.env.SQL_DB_NAME;
  const databaseUrl = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;

  console.log('[PROMOTION] Connecting to database...');
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  });

  const identityId = 'd0ae1488-913e-4895-93d8-87e0e717ad67'; // Wegdan's identity
  const roleId = 'administrator';

  try {
    const identity = await prisma.identityRecord.findUnique({
      where: { id: identityId },
      include: { user: true, account: true }
    });

    if (!identity) {
      console.error('[PROMOTION ERROR] Wegdan identity not found in database.');
      process.exit(1);
    }

    console.log('[PROMOTION] Found identity:', identity.user?.displayName, 'with email:', identity.user?.primaryEmail);

    // Ensure the administrator role exists
    await prisma.roleRecord.upsert({
      where: { id: roleId },
      create: {
        id: roleId,
        name: 'Administrator',
        description: 'Full administrative authority',
        permissions: ['admin:*'],
        policyIds: []
      },
      update: {
        permissions: ['admin:*']
      }
    });
    console.log('[PROMOTION] Administrator role record is verified/upserted.');

    // Idempotently create role assignment
    const existingAssignment = await prisma.roleAssignmentRecord.findFirst({
      where: {
        identityId: identityId,
        roleId: roleId
      }
    });

    if (!existingAssignment) {
      await prisma.roleAssignmentRecord.create({
        data: {
          id: randomUUID(),
          identityId: identityId,
          roleId: roleId
        }
      });
      console.log('[PROMOTION] Successfully assigned "administrator" role to the identity.');
    } else {
      console.log('[PROMOTION] Identity already has the "administrator" role assigned.');
    }

    // Write audit record to match the first admin bootstrap audit log requirement
    const existingAudit = await prisma.auditRecord.findUnique({
      where: { reference: 'FIRST_ADMIN_BOOTSTRAP_ONCE' }
    });

    if (!existingAudit) {
      await prisma.auditRecord.create({
        data: {
          id: randomUUID(),
          reference: 'FIRST_ADMIN_BOOTSTRAP_ONCE',
          action: 'FIRST_ADMIN_BOOTSTRAPPED',
          category: 'AUTHORIZATION',
          severity: 'CRITICAL',
          actorId: 'operator-system',
          actorType: 'OPERATOR',
          targetId: identityId,
          targetType: 'IDENTITY',
          source: 'controlled-first-admin-cli',
          timestamp: new Date(),
          correlationReference: 'M8-PROMOTION-2026',
          contextMetadata: { approverId: 'approver-system', roleId: roleId, changeId: 'M8-PROMOTION-2026' }
        }
      });
      console.log('[PROMOTION] Successfully recorded bootstrap audit trail.');
    } else {
      console.log('[PROMOTION] Bootstrap audit trail already exists.');
    }

    console.log('[PROMOTION SUCCESS] Account successfully upgraded to First Owner/Admin!');
  } catch (err: any) {
    console.error('[PROMOTION ERROR] Execution failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
