import type { Prisma } from '@prisma/client';
/** Approved owner read contract. The row lock spans the owning-domain decision transaction. */
export async function assertImportReviewLease(tx: Prisma.TransactionClient, recordId: string, actorId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`import-governance:review:${recordId}`}, 0))`;
  const assignment = await tx.importReviewAssignment.findUnique({ where: { recordId } });
  // Historical unassigned records retain their independent owner authorization.
  if (!assignment) return;
  if (assignment.state !== 'CLAIMED' || assignment.assigneeId !== actorId || assignment.claimedBy !== actorId ||
      !assignment.claimUntil || assignment.claimUntil <= new Date()) throw new Error('IMPORT_REVIEW_LEASE_REQUIRED');
}
