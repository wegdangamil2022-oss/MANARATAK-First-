// No URL argument: accepts only a signed/attested disposable local lab directory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
assert.equal(process.argv.length, 4, 'LAB_AND_EVIDENCE_DIRECTORIES_REQUIRED');
const root = process.cwd(),
  dir = path.resolve(process.argv[2]),
  evidence = path.resolve(process.argv[3]);
assert.ok(fs.statSync(evidence).isDirectory());
const state = JSON.parse(fs.readFileSync(path.join(dir, 'lab-state.json'), 'utf8')),
  contract = JSON.parse(fs.readFileSync(path.join(dir, 'targets.json'), 'utf8'));
const { assertNativeLabState } = await import('./post28-native-lab-policy.mjs');
assertNativeLabState(state, contract, state.sourceSha, dir);
const bindings = Object.fromEntries(
  fs
    .readFileSync(path.join(dir, 'lab.env'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
for (const key of ['DATABASE_URL', 'POST28_TRANSACTION_SETUP_URL']) {
  const u = new URL(bindings[key]);
  assert.equal(u.hostname, '127.0.0.1');
  assert.equal(u.port, '60157');
}
const { preflightTargets } = await import('./post28-isolation.mjs'),
  { readDatabaseIdentity } = await import('./post28-preflight.mjs');
await preflightTargets(
  contract,
  [{ label: 'DB-T', url: bindings.DATABASE_URL }],
  { ...process.env, ...bindings },
  contract.sourceSha,
  readDatabaseIdentity,
  { requireValidatedCatalog: true },
);
const require = createRequire(path.join(root, 'package.json')),
  { PrismaClient } = require('@prisma/client');
const setup = new PrismaClient({
    datasources: { db: { url: bindings.POST28_TRANSACTION_SETUP_URL } },
    errorFormat: 'minimal',
    log: [],
  }),
  app = new PrismaClient({
    datasources: { db: { url: bindings.DATABASE_URL } },
    errorFormat: 'minimal',
    log: [],
  });
const tables = [
  'StudentSupportCaseLinkRecord',
  'StudentSupportEventRecord',
  'StudentSupportMessageRecord',
  'StudentSupportCaseRecord',
  'StudentSupportMacroRecord',
  'StudentSupportPolicyRecord',
  'StudentSupportTeamMemberRecord',
  'StudentSupportTeamRecord',
];
const ident = (s) => '"' + s.replaceAll('"', '""') + '"';
const name = '20261028000200_student_support_cases',
  migration = path.join(root, 'packages/infrastructure/prisma/migrations', name, 'migration.sql');
const sql = fs.readFileSync(migration, 'utf8'),
  checksum = createHash('sha256').update(sql).digest('hex');
// A psql file preserves dollar-quoted functions and never prints database credentials.
function apply(file) {
  const u = new URL(bindings.POST28_TRANSACTION_SETUP_URL),
    exe = path.resolve(root, '../pg16-binaries/pgsql/bin/psql.exe');
  const r = spawnSync(
    exe,
    ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--quiet', '--single-transaction', '--file', file],
    {
      env: {
        ...process.env,
        PGHOST: u.hostname,
        PGPORT: u.port,
        PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
        PGUSER: decodeURIComponent(u.username),
        PGPASSWORD: decodeURIComponent(u.password),
      },
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  if (r.status !== 0)
    throw Error(
      'SUPPORT_LAB_SQL_FAILED:' +
        String(r.stderr ?? r.error?.message)
          .replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[PRIVATE_URL]')
          .slice(0, 500),
    );
}
const fromRoot = async (p) => import(pathToFileURL(path.join(root, p)));
const { PrismaSupportCaseRepository } = await fromRoot(
  'packages/infrastructure/src/student-support/PrismaSupportCaseRepository.ts',
);
const { SupportCaseUseCases } = await fromRoot(
  'packages/application/src/student-support/SupportCaseUseCases.ts',
);
const { AtomicDomainMutationCoordinator } = await fromRoot(
  'packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts',
);
const { AtomicAuditedOutboxMutationExecutor } = await fromRoot(
  'packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts',
);
const { PrismaAuditRecordRepository } = await fromRoot(
  'packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts',
);
const { PrismaTransactionalOutboxStore } = await fromRoot(
  'packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts',
);
let installed = false,
  checks = 0;
const snapshot = async (db) => ({
  identities: await db.identityRecord.count(),
  workspaces: await db.studentWorkspace.count(),
  audit: await db.auditRecord.count(),
  outbox: await db.transactionalOutboxRecord.count(),
});
try {
  const old = await snapshot(setup);
  for (const table of tables) {
    const r = await setup.$queryRawUnsafe(
      'SELECT to_regclass($1)::text AS relation',
      'public.' + ident(table),
    );
    assert.equal(r[0].relation, null, 'SUPPORT_TABLE_ALREADY_PRESENT');
  }
  const notReady = new PrismaSupportCaseRepository(
    app,
    'isolated-support-cursor-secret-long-enough',
    async () => true,
  );
  assert.equal((await notReady.readiness()).ready, false);
  checks++;
  apply(migration);
  installed = true;
  await setup.$executeRawUnsafe(
    `GRANT SELECT,INSERT,UPDATE ON ${['StudentSupportCaseRecord', 'StudentSupportTeamRecord', 'StudentSupportTeamMemberRecord', 'StudentSupportPolicyRecord', 'StudentSupportMacroRecord'].map(ident).join(',')} TO post28_app`,
  );
  await setup.$executeRawUnsafe(
    `GRANT SELECT,INSERT ON ${['StudentSupportMessageRecord', 'StudentSupportEventRecord', 'StudentSupportCaseLinkRecord'].map(ident).join(',')} TO post28_app`,
  );
  assert.equal((await notReady.readiness()).ready, true);
  checks++;
  const rolled = 'SUPPORT_LAB_ROLLBACK_' + randomUUID();
  try {
    await app.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
        const boundary = { boundaryId: randomUUID(), transactionClient: tx },
          repository = new PrismaSupportCaseRepository(
            tx,
            'isolated-support-cursor-secret-long-enough',
            async () => true,
          );
        const executor = new AtomicAuditedOutboxMutationExecutor(
          { execute: (work) => work(boundary) },
          new PrismaAuditRecordRepository(app),
          new PrismaTransactionalOutboxStore(app),
        );
        const now = new Date('2026-10-28T10:00:00.000Z'),
          owner = new SupportCaseUseCases(
            repository,
            new AtomicDomainMutationCoordinator(executor),
            () => now,
          );
        const studentId = randomUUID(),
          otherId = randomUUID(),
          agentId = randomUUID();
        for (const id of [studentId, otherId, agentId])
          await tx.identityRecord.create({
            data: {
              id,
              type: 'Human',
              status: 'ACTIVE',
              createdBy: 'isolated-support-verification',
            },
          });
        for (const studentReferenceId of [studentId, otherId])
          await tx.studentWorkspace.create({ data: { studentReferenceId, status: 'ACTIVE' } });
        const student = await owner.access(studentId, 'STUDENT'),
          other = await owner.access(otherId, 'STUDENT'),
          agent = await owner.access(agentId, 'AGENT', true, true);
        const ctx = (actorId, key = randomUUID()) => ({
          actorId,
          requestId: key,
          source: 'isolated-support-acceptance',
        });
        const key = randomUUID(),
          input = {
            title: 'Isolated support case',
            body: 'Private lab question',
            category: 'TECHNICAL',
          };
        const created = await owner.create(input, student, ctx(studentId, key)),
          id = created.record.id;
        assert.equal(await tx.studentSupportMessageRecord.count({ where: { caseId: id } }), 1);
        assert.equal(await tx.auditRecord.count({ where: { targetId: id } }), 1);
        assert.equal(await tx.transactionalOutboxRecord.count({ where: { aggregateId: id } }), 1);
        checks++;
        const saved = await owner.commandStatus(key,student);
        assert.equal(saved.state,'SAVED');assert.equal(saved.caseId,id);assert.ok(saved.messageId);
        assert.equal((await owner.commandStatus(key,other)).state,'UNKNOWN');checks++;
        assert.equal((await owner.messageStatus(id,saved.messageId,student)).notification,'QUEUED');checks++;
        const replay = await owner.create(input, student, ctx(studentId, key));
        assert.equal(replay.record.id, id);
        assert.equal(replay.replayed, true);
        assert.equal(await tx.studentSupportMessageRecord.count({ where: { caseId: id } }), 1);
        checks++;
        await assert.rejects(
          owner.create({ ...input, body: 'Different command' }, student, ctx(studentId, key)),
          /IDEMPOTENCY_CONFLICT/,
        );
        checks++;
        await assert.rejects(owner.get(id, other), /NOT_FOUND/);
        assert.deepEqual((await owner.list({ limit: 20 }, other)).items, []);
        checks++;
        const note = await owner.reply(
          id,
          { body: 'Internal staff note', internal: true, expectedVersion: 1 },
          agent,
          ctx(agentId),
        );
        assert.equal(note.record.firstPublicReplyAt, null);
        assert.equal((await owner.messages(id, student)).items.length, 1);
        assert.equal((await owner.messages(id, agent)).items.length, 2);
        checks++;
        const privateMessage = await tx.studentSupportMessageRecord.findFirst({where:{caseId:id,visibility:'INTERNAL'}});
        assert.equal((await owner.messageStatus(id,privateMessage.id,agent)).notification,'NOT_REQUESTED');
        await assert.rejects(owner.messageStatus(id,privateMessage.id,student),/MESSAGE_NOT_FOUND/);checks++;
        const replied = await owner.reply(
          id,
          { body: 'Public answer', expectedVersion: 2 },
          agent,
          ctx(agentId),
        );
        assert.equal(replied.record.firstPublicReplyAt, now.toISOString());
        assert.equal((await owner.messages(id, student)).items.length, 2);
        checks++;
        await assert.rejects(
          owner.reply(id, { body: 'stale answer', expectedVersion: 2 }, agent, ctx(agentId)),
          /VERSION_CONFLICT/,
        );
        assert.equal(await tx.studentSupportMessageRecord.count({ where: { caseId: id } }), 3);
        checks++;
        const resolved = await owner.change(
          id,
          { expectedVersion: 3, status: 'RESOLVED', reason: 'Question answered' },
          agent,
          ctx(agentId),
        );
        const closed = await owner.change(
          id,
          {
            expectedVersion: resolved.record.version,
            status: 'CLOSED',
            reason: 'Closure verified',
          },
          agent,
          ctx(agentId),
        );
        assert.equal(closed.record.status, 'CLOSED');
        const replyKey = randomUUID(),
          reopened = await owner.reply(
            id,
            { body: 'More information' },
            student,
            ctx(studentId, replyKey),
          );
        assert.equal(reopened.record.status, 'REOPENED');
        assert.equal(reopened.record.resolvedAt, null);
        const same = await owner.reply(
          id,
          { body: 'More information' },
          student,
          ctx(studentId, replyKey),
        );
        assert.equal(same.replayed, true);
        checks++;
        const cursor = (await owner.messages(id, student, 1)).nextCursor;
        assert.ok(cursor);
        await assert.rejects(owner.messages(id, other, 1, cursor), /NOT_FOUND/);
        checks++;
        const otherCase = await owner.create(input, other, ctx(otherId));
        await assert.rejects(
          owner.change(
            id,
            {
              expectedVersion: reopened.record.version,
              relatedCaseId: otherCase.record.id,
              reason: 'Invalid cross student link',
            },
            agent,
            ctx(agentId),
          ),
          /DUPLICATE_LINK_INVALID/,
        );
        checks++;
        const safeAgent = { ...agent, internalNotes: false };
        assert.ok(
          (await owner.events(id, safeAgent)).items.every((e) => e.type !== 'INTERNAL_NOTE_ADDED'),
        );
        checks++;
        const audits = await tx.auditRecord.findMany({
            where: { targetId: id },
            select: { contextMetadata: true },
          }),
          outbox = await tx.transactionalOutboxRecord.findMany({
            where: { aggregateId: id },
            select: { payload: true },
          });
        for (const value of [audits, outbox])
          for (const secret of [
            'Private lab question',
            'Internal staff note',
            'Public answer',
            'More information',
          ])
            assert.ok(!JSON.stringify(value).includes(secret));
        checks++;
        const rejects = async (label, work) => {
          await tx.$executeRawUnsafe('SAVEPOINT support_negative');
          let denied = false;
          try {
            await work();
          } catch {
            denied = true;
          }
          await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT support_negative');
          await tx.$executeRawUnsafe('RELEASE SAVEPOINT support_negative');
          assert.equal(denied, true, label);
          checks++;
        };
        await rejects('message immutable', () =>
          tx.$executeRawUnsafe(
            'UPDATE "StudentSupportMessageRecord" SET body=$1 WHERE "caseId"=$2',
            'tamper',
            id,
          ),
        );
        await rejects('event immutable', () =>
          tx.$executeRawUnsafe(
            'UPDATE "StudentSupportEventRecord" SET type=$1 WHERE "caseId"=$2',
            'tamper',
            id,
          ),
        );
        await rejects('case delete denied', () =>
          tx.$executeRawUnsafe('DELETE FROM "StudentSupportCaseRecord" WHERE id=$1', id),
        );
        await rejects('cross student link database guard', () =>
          tx.$executeRawUnsafe(
            'INSERT INTO "StudentSupportCaseLinkRecord" ("caseId","relatedCaseId","linkedBy") VALUES ($1,$2,$3)',
            id,
            otherCase.record.id,
            agentId,
          ),
        );
        const metrics = await owner.metrics(other);
        assert.equal(metrics.total, 1);
        assert.equal(metrics.csat, null);
        checks++;
        throw Error(rolled);
      },
      { timeout: 90000, maxWait: 30000 },
    );
  } catch (error) {
    if (error.message !== rolled) throw error;
  }
  assert.deepEqual(await snapshot(setup), old);
  for (const table of tables) {
    const [r] = await setup.$queryRawUnsafe(`SELECT count(*)::integer AS n FROM ${ident(table)}`);
    assert.equal(r.n, 0);
  }
  checks++;
  const result = {
    pass: true,
    checks,
    profile: 'ATTESTED_DISPOSABLE_LOCAL_LAB',
    migration: name,
    checksum,
    transactionRollbackVerified: true,
    originalWrites: 0,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(evidence, 'support-storage-lab.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  if (installed) {
    await setup.$transaction(async (tx) => {
      for (const table of tables) await tx.$executeRawUnsafe('DROP TABLE ' + ident(table));
      await tx.$executeRawUnsafe('DROP FUNCTION "support_reject_history_mutation"()');
      await tx.$executeRawUnsafe('DROP FUNCTION "support_validate_case_link"()');
    });
  }
  await setup.$disconnect();
  await app.$disconnect();
}
