import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { UniversalImportHandoff } from '@manaratak/domain';
import type { IImportScreeningReceiptStore } from '@manaratak/application';

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
}

export function screeningReceiptIdentity(handoff: UniversalImportHandoff) {
  const ownerDomain = handoff.ownerDomain.trim().toUpperCase();
  if (!handoff.handoffId || !handoff.execution?.executionId || !ownerDomain) throw new Error('IMPORT_RECEIPT_IDENTITY_INVALID');
  const handoffKey = createHash('sha256').update(JSON.stringify([handoff.execution.executionId, handoff.handoffId])).digest('hex');
  // Preserve all semantic inputs, but do not bind a retry attempt number.
  const requestHash = createHash('sha256').update(JSON.stringify(canonical({ ...handoff,
    execution: { ...handoff.execution, attempt: 0 } }))).digest('hex');
  return { ownerDomain, handoffKey, requestHash };
}
/** Receipts for pure screening only. No canonical write is admitted into this transaction. */
export class PrismaImportScreeningReceiptStore implements IImportScreeningReceiptStore {
  constructor(private readonly prisma: PrismaClient) {}
  async find(handoff: UniversalImportHandoff) {
    const identity = screeningReceiptIdentity(handoff);
    const row = await this.prisma.importScreeningReceipt.findUnique({ where: {
      ownerDomain_handoffKey: { ownerDomain: identity.ownerDomain, handoffKey: identity.handoffKey } } });
    if (row && row.requestHash !== identity.requestHash) throw new Error('IMPORT_RECEIPT_CONTENT_CONFLICT');
    return row ? { result: row.result } : null;
  }
  async accept(handoff: UniversalImportHandoff, screen: () => Promise<unknown>) {
    const identity = screeningReceiptIdentity(handoff);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`screening:${identity.ownerDomain}:${identity.handoffKey}`}, 0))`;
      const prior = await tx.importScreeningReceipt.findUnique({ where: {
        ownerDomain_handoffKey: { ownerDomain: identity.ownerDomain, handoffKey: identity.handoffKey } } });
      if (prior) {
        if (prior.requestHash !== identity.requestHash) throw new Error('IMPORT_RECEIPT_CONTENT_CONFLICT');
        return prior.result;
      }
      const result = await screen();
      const serialized = JSON.stringify(result ?? null);
      if (!serialized || Buffer.byteLength(serialized) > 256 * 1024) throw new Error('IMPORT_RECEIPT_RESULT_INVALID');
      const stored = JSON.parse(serialized) as Prisma.InputJsonValue;
      await tx.importScreeningReceipt.create({ data: { id: randomUUID(), ...identity,
        result: stored === null ? Prisma.JsonNull : stored } });
      return result ?? null;
    }, { timeout: 15_000 });
  }
}
