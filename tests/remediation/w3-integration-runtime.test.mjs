import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('W3 owner event producers and consumers are runtime composed', () => {
  const identity = read('packages/infrastructure/src/identity/PrismaIdentityRepository.ts');
  const services = read('packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts');
  const career = read('packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts');
  const server = read('apps/api/src/server.ts');
  assert.match(identity, /IdentityCreated\.v1/);
  assert.match(services, /ServiceRequested\.v1/);
  assert.match(career, /JobPosted\.v1/);
  assert.match(server, /runSettingsOnce/);
  assert.match(server, /runCareerOnce/);
  assert.match(server, /runServicesOnce/);
});

test('W3 notification worker uses current durable handler contract with lease fencing', () => {
  const handler = read('packages/application/src/background-jobs/handlers/NotificationDeliveryBackgroundJobHandler.ts');
  const repo = read('packages/infrastructure/src/notification/PrismaNotificationRepositories.ts');
  assert.match(handler, /IBackgroundJobHandler/);
  assert.match(handler, /async handle\(/);
  assert.doesNotMatch(handler, /BackgroundJobExecutionContext/);
  assert.match(handler, /NOTIFICATION_DELIVERY_LEASE_LOST/);
  assert.match(handler, /markSuppressed/);
  assert.match(handler, /hasOptedOut/);
  assert.match(handler, /DELIVERY_CONCURRENCY/);
  assert.match(repo, /INTERVAL '1 hour'/);
  assert.match(repo, /leaseUntil: \{ gte: now \}/);
});

test('W3 finance convergence includes ambiguous PROCESSING refunds', () => {
  const useCases = read('packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts');
  const provider = read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts');
  assert.match(useCases, /refund\.status === 'PROCESSING'/);
  assert.match(useCases, /gateway\.getRefundStatus/);
  assert.match(provider, /\/v1\/finance\/payments\/refund-status/);
  assert.match(provider, /refundReference/);
});

test('W3 certificate and owner pollers expose operational lifecycle health', () => {
  const registry = read('packages/application/src/event-foundation/use-cases/PollingWorkerRuntimeRegistry.ts');
  const app = read('apps/api/src/app.ts');
  for (const token of ['lastStartedAt', 'lastSuccessAt', 'lastFailureAt', 'state']) assert.ok(registry.includes(token), token);
  assert.match(app, /name: 'polling-workers'/);
  assert.match(app, /lastSuccessLagMs/);
});
