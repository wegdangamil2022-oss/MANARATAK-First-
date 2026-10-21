// Scoped route diagnostic: real scheduler, handlers, PostgreSQL queues and outbox.
// Domain use-case/provider calls and Redis transport are explicit fault adapters.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createContainer, asValue } from '@manaratak-vendor/awilix-core';
import { DurableBackgroundWorker, BackgroundWorkerRuntimeState } from '../../../packages/application/src/background-jobs/workers/DurableBackgroundWorker.ts';
import { BackgroundJobHandlerRegistry } from '../../../packages/application/src/background-jobs/workers/BackgroundJobHandlerRegistry.ts';
import { FinanceReconciliationBackgroundJobHandler } from '../../../packages/application/src/background-jobs/handlers/FinanceReconciliationBackgroundJobHandler.ts';
import { ImportQueueBackgroundJobHandler } from '../../../packages/application/src/background-jobs/handlers/ImportQueueBackgroundJobHandler.ts';
import { PrismaBackgroundJobExecutionGateway } from '../../../packages/infrastructure/src/background-jobs/PrismaBackgroundJobExecutionGateway.ts';
import { PrismaTransactionalOutboxStore } from '../../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import { TransactionalOutboxDispatcher } from '../../../packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts';
import { CertificateCompletionOutboxWorker } from '../../../packages/application/src/certificates/use-cases/CertificateCompletionOutboxWorker.ts';
import { PollingWorkerRuntimeRegistry } from '../../../packages/application/src/event-foundation/use-cases/PollingWorkerRuntimeRegistry.ts';
import { startPollingWorkers, stopPollingWorkers } from '../../../apps/api/src/infrastructure/workers/PollingWorkerRuntime.ts';
import { WorkerHealthObservation } from '../../../apps/api/src/infrastructure/runtime/WorkerHealthObservation.ts';
import { freshWorkerEvidence } from '../../../apps/api/src/presentation/monitoring/RuntimeHealthPolicy.ts';

const url = new URL(process.env.DATABASE_URL);
assert.equal(process.env.POST28_R14_WORKER_FAULTS, 'SYNTHETIC_NEW_CLUSTER_ONLY');
assert.equal(url.hostname, '127.0.0.1');
assert.match(url.pathname, /^\/manaratak_r14_workers_[a-f0-9]{16}$/);
assert.equal(url.username, 'post28_r14_worker');
assert.match(process.env.POST28_EXPECTED_SERVER_ID, /^\d+$/);
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
const protectedTables = ['StudentPrivacyConsentDecision', 'StudentApplicationDocumentBinding', 'FinancialLedgerEntryRecord', 'FinanceInvoiceRecord', 'Certificate', 'CertificateIssuer', 'CertificateTemplate', 'CertificateTemplateVersion'];
const fingerprint = async () => {
  const result = {};
  for (const table of protectedTables) {
    const rows = await db.$queryRawUnsafe('SELECT row_to_json(t)::text AS row FROM public."' + table + '" t ORDER BY row_to_json(t)::text');
    result[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  }
  return result;
};
const values = new Map(), observationWrites = [];
const health = new WorkerHealthObservation({
  get: async key => values.get(key) ?? null,
  set: async (key, value) => { values.set(key, value); observationWrites.push(JSON.parse(value)); },
}, { environment: 'test', apiOrigin: 'http://127.0.0.1', revision: process.env.POST28_SOURCE_SHA });
let publications = [];
const publish = (name, snapshot) => { const task = health.publish(name, snapshot); publications.push(task); return task; };
const flush = async () => { await Promise.all(publications); publications = []; };
const registry = new PollingWorkerRuntimeRegistry(publish);
const state = new BackgroundWorkerRuntimeState(snapshot => publish('background-jobs', snapshot));
const queue = new PrismaBackgroundJobExecutionGateway(db), metrics = [];
const container = createContainer();
container.register({ pollingWorkerRuntimeRegistry: asValue(registry), monitoringService: asValue({ getMetrics: () => ({ incrementCounter: (...v) => metrics.push(v), recordHistogram: () => {} }) }) });
const poll = async (flag, finished) => {
  const config = { getOptional: name => name.endsWith('_ENABLED') ? name === flag : name.endsWith('_INTERVAL_MS') && !name.endsWith('_HEARTBEAT_INTERVAL_MS') ? 60000 : undefined };
  const handle = await startPollingWorkers(container, config);
  try {
    const deadline = Date.now() + 12000;
    while (!(await finished())) { assert(Date.now() < deadline, 'ROUTE_DID_NOT_SETTLE'); await new Promise(r => setTimeout(r, 10)); }
  } finally { await handle.stop(); await flush(); }
};
const job = async type => {
  const reference = randomUUID();
  await db.backgroundJobRecord.create({ data: { id: reference, reference, jobType: type, parameters: { maxJobs: 1, limit: 1 }, maxAttempts: 2, backoffType: 'none', timeoutSeconds: 10, availableAt: new Date(Date.now() - 1000) } });
  return reference;
};
const attempts = ref => db.backgroundJobExecutionRecord.count({ where: { jobReference: ref, outcome: { not: 'RUNNING' } } });
const facts = async ref => ({ job: await db.backgroundJobRecord.findUnique({ where: { reference: ref } }), executions: await db.backgroundJobExecutionRecord.findMany({ where: { jobReference: ref }, orderBy: { attempt: 'asc' } }), dlq: await db.backgroundJobDeadLetterRecord.count({ where: { jobReference: ref } }) });
try {
  const [identity] = await db.$queryRaw`SELECT current_database() AS database,current_user AS role,current_setting('server_version_num') AS version,(SELECT system_identifier::text FROM pg_control_system()) AS server_id,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
  assert.equal(identity.server_id, process.env.POST28_EXPECTED_SERVER_ID);
  assert.equal(Math.floor(Number(identity.version) / 10000), 16);
  for (const key of ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolreplication', 'rolbypassrls']) assert.equal(identity[key], false);
  assert.equal(await db.backgroundJobRecord.count({ where: { status: { in: ['SCHEDULED', 'STARTED'] } } }), 0);
  assert.equal(await db.transactionalOutboxRecord.count({ where: { domain: 'COURSES', eventType: { in: ['CourseCompleted', 'LearningPathCompleted'] }, state: { not: 'PROCESSED' } } }), 0);
  const baseline = await fingerprint();
  let financeCalls = 0, reconcileCalls = 0;
  const financeKeys = [], importContexts = [];
  const finance = new FinanceReconciliationBackgroundJobHandler({
    reconcileProviderStates: async request => { financeCalls++; financeKeys.push(request.idempotencyKey); if (financeCalls === 1) throw Error('SYNTHETIC_FINANCE_BOUNDARY_UNAVAILABLE'); },
    reconcile: async () => { reconcileCalls++; },
  });
  const imports = new ImportQueueBackgroundJobHandler({ processNextQueuedBatch: async context => { importContexts.push(context); throw Error('SYNTHETIC_IMPORT_BOUNDARY_UNAVAILABLE'); } });
  const worker = new DurableBackgroundWorker(queue, new BackgroundJobHandlerRegistry([finance, imports]), state);
  container.register({ durableBackgroundWorker: asValue(worker) });
  const financeRef = await job(finance.jobType);
  await poll('BACKGROUND_WORKER_ENABLED', async () => await attempts(financeRef) === 1);
  const financeFailed = await facts(financeRef), failureObservation = await health.read('background-jobs');
  assert.equal(financeFailed.job.status, 'SCHEDULED');
  assert.equal(financeFailed.executions[0].outcome, 'FAILED');
  assert.equal(reconcileCalls, 0);
  assert.equal(failureObservation.state, 'DEGRADED');
  assert.equal(freshWorkerEvidence(failureObservation, 15000), false);
  await new Promise(r => setTimeout(r, 2));
  await poll('BACKGROUND_WORKER_ENABLED', async () => await attempts(financeRef) === 2);
  const financeRecovered = await facts(financeRef), recoveryObservation = await health.read('background-jobs');
  assert.equal(financeRecovered.job.status, 'COMPLETED');
  assert.deepEqual(financeRecovered.executions.map(e => e.outcome), ['FAILED', 'SUCCEEDED']);
  assert.deepEqual(financeKeys, [financeRef, financeRef]);
  assert.equal(reconcileCalls, 1);
  assert.equal(freshWorkerEvidence(recoveryObservation, 15000), true);
  const importRef = await job(imports.jobType);
  await poll('BACKGROUND_WORKER_ENABLED', async () => await attempts(importRef) === 1);
  assert.equal((await facts(importRef)).job.status, 'SCHEDULED');
  assert.equal(freshWorkerEvidence(await health.read('background-jobs'), 15000), false);
  await poll('BACKGROUND_WORKER_ENABLED', async () => await attempts(importRef) === 2);
  const importFailed = await facts(importRef);
  assert.equal(importFailed.job.status, 'FAILED');
  assert.deepEqual(importFailed.executions.map(e => e.outcome), ['FAILED', 'DLQ']);
  assert.equal(importFailed.dlq, 1);
  assert.deepEqual(importContexts, ['bg-import:' + importRef + ':1', 'bg-import:' + importRef + ':2']);
  assert.equal(state.snapshot().lastErrorCode, 'BACKGROUND_JOB_DLQ');
  assert.equal(freshWorkerEvidence(await health.read('background-jobs'), 15000), false);
  let certificateCalls = 0;
  const certificateKeys = [], outboxId = randomUUID();
  await db.transactionalOutboxRecord.create({ data: { id: outboxId, domain: 'COURSES', eventType: 'CourseCompleted', payload: { source: 'SYNTHETIC_ROUTE_FAULT_ONLY' }, metadata: {}, availableAt: new Date(Date.now() - 1000) } });
  const dispatcher = new TransactionalOutboxDispatcher(new PrismaTransactionalOutboxStore(db), { deliver: async (_entry, context) => { certificateCalls++; certificateKeys.push(context.idempotencyKey); if (certificateCalls === 1) throw Error('SYNTHETIC_CERTIFICATE_BOUNDARY_UNAVAILABLE'); } });
  container.register({ certificateCompletionOutboxWorker: asValue(new CertificateCompletionOutboxWorker(dispatcher, { batchSize: 1, baseBackoffMs: 1, maxBackoffMs: 1 })) });
  await poll('CERTIFICATE_COMPLETION_WORKER_ENABLED', async () => (await db.transactionalOutboxRecord.findUnique({ where: { id: outboxId } })).attempts === 1);
  assert(metrics.some(v => v[0] === 'worker.iterations.failed' && v[2].worker === 'certificate-completion'));
  const certificateFailed = await db.transactionalOutboxRecord.findUnique({ where: { id: outboxId } });
  assert.equal(certificateFailed.state, 'FAILED');
  await poll('CERTIFICATE_COMPLETION_WORKER_ENABLED', async () => (await db.transactionalOutboxRecord.findUnique({ where: { id: outboxId } })).state === 'PROCESSED');
  assert.deepEqual(certificateKeys, [outboxId, outboxId]);
  assert.equal(certificateCalls, 2);
  assert.deepEqual(await fingerprint(), baseline);
  await worker.drain();
  console.log(JSON.stringify({ sourceSha: process.env.POST28_SOURCE_SHA, scope: 'WINDOWS_REAL_POSTGRES_SCHEDULER_HANDLERS_QUEUE_FAULT_BOUNDARIES', identity, finance: { retryThenCompleted: true, stableIdempotencyKey: true, failedAttemptSkippedReconcile: true }, imports: { retryThenDlq: true, attempts: 2, dlqRows: 1 }, certificates: { outboxFailureObserved: true, retryProcessed: true, stableIdempotencyKey: true }, health: { failureObservation, recoveryObservation, durableFailurePublished: true, transport: 'IN_MEMORY_REDIS_ADAPTER' }, protectedBeforeAndAfter: baseline, financialProviderCalled: false, domainUseCasesSubstituted: true, productionAcceptance: false, drain: state.snapshot().state }));
} finally { await stopPollingWorkers(); await db.$disconnect(); }
