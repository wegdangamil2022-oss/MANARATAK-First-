import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RetentionOwner } from '@manaratak/domain';
import { RetentionSweepUseCase } from '@manaratak/application';
import { PrismaAuditRecordRepository } from '../../../packages/infrastructure/src/audit/PrismaAuditRecordRepository';
import { PrismaAuditRetentionGateway } from '../../../packages/infrastructure/src/retention/PrismaAuditRetentionGateway';
import { PrismaRetentionDecisionRepository } from '../../../packages/infrastructure/src/retention/PrismaRetentionDecisionRepository';
import { disposableClient } from './disposable';

const db = disposableClient();
const prefix = 'review02-' + randomUUID();
const audit = new PrismaAuditRecordRepository(db);
function row(suffix: string, contextMetadata: object = {}) {
  const id = prefix + suffix;
  return { id, reference: 'AUD-' + id, action: 'ROLE_CREATED', category: prefix, severity: 'INFO', actorId: prefix, actorType: 'IDENTITY', targetId: id, targetType: 'ROLE', source: 'isolated-test', timestamp: new Date('2026-01-01T00:00:00Z'), contextMetadata };
}

describe('02 real PostgreSQL JSON filters, volume, and retention retry', () => {
  beforeAll(() => db.$connect());
  afterAll(async () => {
    await db.auditRecord.deleteMany({ where: { category: prefix } });
    await db.retentionDecisionRecord.deleteMany({ where: { recordId: { startsWith: prefix } } });
    await db.$disconnect();
  });

  it('distinguishes intent/success/failure/unknown with real JSON null predicates', async () => {
    await db.auditRecord.createMany({ data: [
      row('-success', { result: 'SUCCESS' }), row('-failure', { result: 'FAILURE' }),
      row('-intent', { result: 'SUCCESS', auditEvent: 'MUTATION_INTENT' }),
      row('-unknown-missing'), row('-unknown-null', { result: null }), row('-unknown-other', { result: 'LEGACY' }),
    ] });
    for (const [result, expected] of [['SUCCESS', ['-success']], ['FAILURE', ['-failure']], ['INTENT', ['-intent']], ['UNKNOWN', ['-unknown-missing', '-unknown-null', '-unknown-other']]] as const) {
      const page = await audit.queryPage({ category: prefix, result, limit: 100 });
      expect(page.items.map(r => r.getId().getValue()).sort()).toEqual(expected.map(s => prefix + s).sort());
    }
  });

  it('checks 100000 synthetic records, keyset export without gaps, and EXPLAIN ANALYZE', async () => {
    const start = performance.now();
    // Synthetic, isolated fixtures only; no owner mutation, seed, or retention worker against a target DB.
    await db.$executeRaw`
      INSERT INTO "AuditRecord" (id, reference, action, category, severity, "actorId", "actorType", "targetId", "targetType", source, timestamp, "contextMetadata", "updatedAt")
      SELECT ${prefix} || '-volume-' || lpad(i::text, 6, '0'), 'AUD-' || ${prefix} || '-volume-' || i::text,
        'ROLE_CREATED', ${prefix}, 'INFO', ${prefix} || '-actor-' || (i % 50)::text,
        'IDENTITY', ${prefix}, 'ROLE', 'isolated-test', TIMESTAMP '2026-01-01' + (i / 5) * interval '1 second',
        '{"result":"SUCCESS"}'::jsonb, now()
      FROM generate_series(1, 100000) AS i`;
    await db.$executeRawUnsafe('ANALYZE "AuditRecord"');
    const actorId = prefix + '-actor-1';
    const ids = new Set<string>();
    let cursor: { timestamp: Date; id: string } | undefined;
    let pages = 0;
    const queryStart = performance.now();
    do {
      const page = await audit.queryPage({ category: prefix, actorId, result: 'SUCCESS', limit: 100, cursor });
      expect(page.items.length).toBeLessThanOrEqual(100);
      for (const record of page.items) {
        expect(ids.has(record.getId().getValue())).toBe(false);
        ids.add(record.getId().getValue());
      }
      pages++;
      cursor = page.nextCursor ?? undefined;
      expect(pages).toBeLessThanOrEqual(21);
    } while (cursor);
    expect(ids.size).toBe(2000);
    const plans = await db.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, timestamp FROM "AuditRecord" WHERE "actorId" = ${actorId} AND category = ${prefix}
      ORDER BY timestamp DESC, id DESC LIMIT 101`;
    const integrity = await audit.verifyIntegrity({ limit: 100 });
    expect(integrity.checkedRecords).toBe(100);
    expect(integrity.hasMore).toBe(true);
    expect(integrity.cryptographicVerification).toBe(false);
    const metrics = { scope: 'SYNTHETIC_100000_ROWS_NOT_PRODUCTION_SLA', inserted: 100000, exportRows: ids.size, pages, exportMs: performance.now() - queryStart, totalMs: performance.now() - start, plans };
    console.log(JSON.stringify(metrics));
    if (process.env.SECTION123_EVIDENCE_DIR) await writeFile(process.env.SECTION123_EVIDENCE_DIR + '/section02-volume.json', JSON.stringify(metrics, null, 2) + '\n');
  });

  it('allows one archival worker, recovers expired leases, and refuses live leases', async () => {
    const now = new Date();
    const expiry = new Date(now.getTime() - 86400000);
    const id = prefix + '-lease';
    await db.auditRecord.create({ data: { ...row('-lease'), retentionExpiresAt: expiry, retentionClaimToken: 'crashed-worker', retentionClaimUntil: new Date(now.getTime() - 1000) } });
    const gateway = new PrismaAuditRetentionGateway(db);
    const candidate = { owner: RetentionOwner.AUDIT, recordId: id, expiresAt: expiry, lifecycleState: 'RECORDED' };
    const decision = { decisionKey: id, owner: RetentionOwner.AUDIT, recordId: id, expiresAt: expiry, disposition: 'ARCHIVE' as import('@manaratak/domain').RetentionDisposition, reason: 'AUDIT_EVIDENCE_ARCHIVE', decidedAt: now };
    const results = await Promise.all([gateway.applyDecision(candidate, decision), gateway.applyDecision(candidate, decision)]);
    expect(results.sort()).toEqual(['APPLIED', 'SKIPPED']);
    const liveId = prefix + '-live';
    await db.auditRecord.create({ data: { ...row('-live'), retentionExpiresAt: expiry, retentionClaimToken: 'live-worker', retentionClaimUntil: new Date(now.getTime() + 60000) } });
    expect(await gateway.applyDecision({ ...candidate, recordId: liveId }, { ...decision, recordId: liveId })).toBe('SKIPPED');
    expect((await db.auditRecord.findUniqueOrThrow({ where: { id: liveId } })).lifecycleState).toBe('RECORDED');
    // Settle the fixture so later tests cannot consume it.
    await db.auditRecord.update({ where: { id: liveId }, data: { retentionProcessedAt: now } });
  });

  it('re-evaluates an audit record after legal hold expiry instead of treating SKIPPED as terminal', async () => {
    const id = prefix + '-hold';
    const now = new Date();
    const expiry = new Date(now.getTime() - 86400000);
    const hold = new Date(now.getTime() + 60000);
    await db.auditRecord.create({ data: { ...row('-hold'), retentionExpiresAt: expiry, legalHoldUntil: hold } });
    // Historical skipped evidence remains present, but must not prevent reevaluation.
    const decisionKey = `${RetentionOwner.AUDIT}:${id}:${expiry.toISOString()}`;
    await db.retentionDecisionRecord.create({ data: { decisionKey, owner: RetentionOwner.AUDIT, recordId: id, expiresAt: expiry, disposition: 'KEEP', reason: 'LEGAL_HOLD_ACTIVE', result: 'SKIPPED', terminalKey: decisionKey, decidedAt: now } });
    const gateway = new PrismaAuditRetentionGateway(db);
    expect((await gateway.listDue(now, 100)).some(candidate => candidate.recordId === id)).toBe(false);
    const decisions = new PrismaRetentionDecisionRepository(db);
    const sweep = new RetentionSweepUseCase([gateway], decisions);
    const first = await sweep.execute({ now });
    expect(first.applied).toBe(0);
    expect((await db.auditRecord.findUniqueOrThrow({ where: { id } })).lifecycleState).toBe('RECORDED');
    const next = await sweep.execute({ now: new Date(hold.getTime() + 1) });
    expect(next.failed).toBe(0);
    expect(next.applied).toBe(1);
    expect((await db.auditRecord.findUniqueOrThrow({ where: { id } })).lifecycleState).toBe('ARCHIVED');
    expect(await decisions.hasTerminalDecision(`${RetentionOwner.AUDIT}:${id}:${expiry.toISOString()}`)).toBe(true);
  });
});
