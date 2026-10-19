// New closure regressions only: isolated owner mocks, no database, provider or workspace build.
// Run with node; TypeScript is a dev dependency (NODE_PATH can select an isolated installation).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const enumValue = new Proxy({}, { get: (_, key) => key });
const domain = new Proxy({ AssetId: class { constructor(value) { this.value = value; } } }, {
  get: (target, key) => target[key] || enumValue,
});
const cache = new Map();
const dbNull = { prismaDbNull: true };
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === '@absheer/domain') return domain;
    if (name === '@prisma/client') return { Prisma: { DbNull: dbNull } };
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const { PrismaServicePlatformRepository: Repository } = load('packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts');
const { ServiceOperationsUseCases: Operations } = load('packages/application/src/services-platform/use-cases/ServiceOperationsUseCases.ts');
const { AssetReferencePolicy } = load('packages/application/src/asset-platform/AssetReferencePolicy.ts');
const { ServiceMaintenanceBackgroundJobHandler: Maintenance } = load('packages/application/src/background-jobs/handlers/ServiceMaintenanceBackgroundJobHandler.ts');
const clone = (value) => structuredClone(value);
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((part) => matches(row, part));
    if (key === 'AND') return value.every((part) => matches(row, part));
    const actual = row[key];
    if (value === null) return actual == null;
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.entries(value).every(([op, expected]) => {
        if (op === 'in') return expected.includes(actual);
        if (op === 'lte') return actual != null && actual <= expected;
        if (op === 'gt') return actual > expected;
        if (op === 'is') return expected === null ? actual == null : matches(actual, expected);
        throw new Error(`Mock predicate unsupported: ${op}`);
      });
    }
    return actual === value;
  });
}
function fixture({ hold = false, bookingStatus = 'CANCELLED', requestStatus = 'CANCELLED', failEvent = false, staleBooking = false } = {}) {
  const state = {
    request: { id: 'r', publicId: 'req', studentReferenceId: 'student', serviceId: 'service', version: 2,
      status: requestStatus, requestParameters: { private: 'student secret' }, fulfillmentMetadata: { private: 'staff secret' },
      inputsErasedAt: null, retentionUntil: new Date(0), legalHoldUntil: hold ? new Date(Date.now() + 60000) : null },
    booking: { id: 'b', publicId: 'booking', requestId: 'r', version: 3, status: bookingStatus,
      inputSnapshot: { secondService: { private: 'package secret' } }, inputsErasedAt: null,
      discountState: 'RESERVED', pricingSnapshot: { discountId: 'coupon' } },
    coupon: { count: 1 }, events: [],
  };
  const apply = (row, data) => {
    for (const [key, value] of Object.entries(data)) {
      row[key] = value?.increment ? row[key] + value.increment : value;
    }
  };
  const tx = {
    serviceRequestRecord: {
      findUnique: async () => clone(state.request),
      findMany: async ({ where }) => matches({ ...state.request, booking: state.booking }, where) ? [clone(state.request)] : [],
      updateMany: async ({ where, data }) => {
        if (!matches(state.request, where)) return { count: 0 };
        apply(state.request, data); return { count: 1 };
      },
      update: async ({ where, data }) => {
        assert.equal(state.request.version, where.id_version.version);
        apply(state.request, data); return state.request;
      },
    },
    serviceBookingRecord: {
      findUnique: async () => clone(state.booking),
      updateMany: async ({ where, data }) => {
        if (staleBooking || !matches(state.booking, where)) return { count: 0 };
        apply(state.booking, data); return { count: 1 };
      },
      update: async ({ where, data }) => {
        assert.equal(state.booking.version, where.version); apply(state.booking, data); return state.booking;
      },
    },
    serviceDiscountRecord: { updateMany: async () => { state.coupon.count--; return { count: 1 }; } },
    transactionalOutboxRecord: { create: async ({ data }) => {
      if (failEvent) throw new Error('OUTBOX_FAULT');
      state.events.push(data); return data;
    } },
  };
  const prisma = { $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const before = clone(state);
    try { return await fn(tx); } catch (error) { Object.assign(state, before); throw error; }
  } };
  return { repo: new Repository(prisma), state };
}
const cases = [];
function test(name, fn) { cases.push([name, fn]); }
test('explicit erasure removes both copies and emits both owner events', async () => {
  const { repo, state } = fixture(); await repo.eraseRequestInputs('r', 'student', 2);
  assert.deepEqual(state.request.requestParameters, {});
  assert.deepEqual(state.booking.inputSnapshot, dbNull);
  assert.ok(state.request.inputsErasedAt && state.booking.inputsErasedAt);
  assert.deepEqual(state.events.map((e) => e.eventType).sort(), ['ServiceBookingInputsErased.v1', 'ServiceRequestInputsErased.v1']);
});
test('active legal hold preserves both input copies', async () => {
  const { repo, state } = fixture({ hold: true });
  await assert.rejects(repo.eraseRequestInputs('r', 'student', 2), /SERVICE_INPUT_ERASURE_LEGAL_HOLD/);
  assert.equal(state.request.version, 2); assert.equal(state.booking.version, 3); assert.equal(state.events.length, 0);
});
test('another student cannot erase inputs', async () => {
  const { repo, state } = fixture();
  await assert.rejects(repo.eraseRequestInputs('r', 'intruder', 2), /SERVICE_REQUEST_NOT_FOUND/);
  assert.equal(state.request.version, 2);
});
test('active booking rolls back request erasure', async () => {
  const { repo, state } = fixture({ bookingStatus: 'IN_PROGRESS' });
  await assert.rejects(repo.eraseRequestInputs('r', 'student', 2), /SERVICE_INPUT_ERASURE_BOOKING_ACTIVE/);
  assert.equal(state.request.requestParameters.private, 'student secret'); assert.equal(state.events.length, 0);
});
test('booking CAS conflict preserves both copies', async () => {
  const { repo, state } = fixture({ staleBooking: true });
  await assert.rejects(repo.eraseRequestInputs('r', 'student', 2), /SERVICE_REQUEST_VERSION_CONFLICT/);
  assert.equal(state.request.inputsErasedAt, null); assert.equal(state.booking.inputsErasedAt, null);
});
test('outbox failure rolls back erasure', async () => {
  const { repo, state } = fixture({ failEvent: true });
  await assert.rejects(repo.eraseRequestInputs('r', 'student', 2), /OUTBOX_FAULT/);
  assert.equal(state.request.version, 2); assert.equal(state.booking.version, 3);
});
test('scheduled retention erases request and package together', async () => {
  const { repo, state } = fixture(); assert.equal(await repo.purgeExpiredInputs(10), 1);
  assert.deepEqual(state.booking.inputSnapshot, dbNull); assert.equal(state.events.length, 2);
});
test('scheduled retention respects legal hold', async () => {
  const { repo, state } = fixture({ hold: true }); assert.equal(await repo.purgeExpiredInputs(10), 0);
  assert.equal(state.booking.inputsErasedAt, null); assert.equal(state.events.length, 0);
});
test('settled request cancellation releases booking and reserved coupon atomically', async () => {
  const { repo, state } = fixture({ requestStatus: 'ACCEPTED', bookingStatus: 'CONFIRMED' });
  await repo.updateRequestStatus('r', 'CANCELLED', 2);
  assert.equal(state.booking.status, 'CANCELLED'); assert.equal(state.coupon.count, 0);
  assert.equal(state.request.cancellationState, 'SETTLED'); assert.equal(state.events.length, 2);
});
test('completed booking cannot be cancelled through request path', async () => {
  const { repo, state } = fixture({ requestStatus: 'IN_PROGRESS', bookingStatus: 'COMPLETED' });
  await assert.rejects(repo.updateRequestStatus('r', 'CANCELLED', 2), /SERVICE_BOOKING_TRANSITION_INVALID/);
  assert.equal(state.request.status, 'IN_PROGRESS'); assert.equal(state.events.length, 0);
});
function workflow({ trusted = true, owner = 'b', requestStatus = 'IN_PROGRESS', bookingStatus = 'IN_PROGRESS' } = {}) {
  let advances = 0;
  const policy = new AssetReferencePolicy({ findById: async () => ({
    state: 'ACTIVE', classification: 'INTERNAL', owner: { ownerId: owner },
    assertCanDeliver() { if (!trusted) throw new Error('REVOKED'); },
  }) });
  const provider = { id: 'p', status: 'QUALIFIED', qualificationMetadata: {
    assetId: 'accreditation', expiresAt: new Date(Date.now() + 60000).toISOString(),
    reviewEvidence: { subjectProviderId: 'p', authorityReviewed: true },
  } };
  const ops = {
    findWorkflowExecutionById: async () => ({ id: 'run', bookingId: 'b', status: 'RUNNING', currentStepKey: 'deliver', workflowDefinitionId: 'def' }),
    findBookingById: async () => ({ id: 'b', requestId: 'r', studentReferenceId: 'student', serviceId: 'service', providerId: 'p', status: bookingStatus, pricingSnapshot: { finalAmountMinorUnits: '0' } }),
    findProviderById: async () => provider,
    findWorkflowDefinitionById: async () => ({ steps: [{ key: 'deliver', requiredArtifactTypes: ['DOCUMENT'] }] }),
    listDeliveryArtifacts: async () => [{ workflowExecutionId: 'run', stepKey: 'deliver', artifactType: 'DOCUMENT', assetId: 'asset' }],
    updateWorkflowExecution: async () => { advances++; },
  };
  const requests = { findRequestById: async () => ({ studentReferenceId: 'student', serviceId: 'service', status: requestStatus, serviceSnapshot: { fulfillmentPolicy: 'FREE' } }) };
  return { useCases: new Operations({}, ops, policy, requests, {}), advances: () => advances };
}
test('revoked asset prevents workflow completion', async () => {
  const f = workflow({ trusted: false }); await assert.rejects(f.useCases.advanceWorkflow('run', 1), /SERVICE_DELIVERY_REVIEW_REQUIRED/); assert.equal(f.advances(), 0);
});
test('asset belonging to another booking prevents completion', async () => {
  const f = workflow({ owner: 'other' }); await assert.rejects(f.useCases.advanceWorkflow('run', 1), /SERVICE_DELIVERY_REVIEW_REQUIRED/); assert.equal(f.advances(), 0);
});
test('trusted booking-owned asset permits progression', async () => {
  const f = workflow(); await f.useCases.advanceWorkflow('run', 1); assert.equal(f.advances(), 1);
});
test('cancelled request cannot resume workflow', async () => {
  const f = workflow({ requestStatus: 'CANCELLED' }); await assert.rejects(f.useCases.advanceWorkflow('run', 1), /SERVICE_FINANCE_CANCELLATION_PENDING/); assert.equal(f.advances(), 0);
});
test('cancelled booking cannot advance a running workflow', async () => {
  const f = workflow({ bookingStatus: 'CANCELLED' }); await assert.rejects(f.useCases.advanceWorkflow('run', 1), /SERVICE_BOOKING_NOT_CONFIRMED/); assert.equal(f.advances(), 0);
});
test('maintenance defaults disabled even for a queued job', async () => {
  let calls = 0;
  const h = new Maintenance({ maintenance: async () => calls++ }, { forActor: () => { calls++; } });
  await assert.rejects(h.handle({}, { signal: new AbortController().signal }), /SERVICE_MAINTENANCE_DISABLED/); assert.equal(calls, 0);
});
test('enabled maintenance performs bounded owner sweeps', async () => {
  const calls = [];
  const h = new Maintenance({ maintenance: async (limit) => calls.push(['requests', limit]) }, { forActor: () => ({ sweepExpiredHolds: async (limit) => calls.push(['bookings', limit]) }) }, true);
  await h.handle({ limit: 200 }, { signal: new AbortController().signal, jobReference: 'job' });
  assert.deepEqual(calls, [['bookings', 100], ['requests', 100]]);
});
test('package booking persists validated inputs inherited from the original request', async () => {
  let saved;
  const provider = { id: 'p', status: 'QUALIFIED', supportedServiceIds: ['service', 'other'], qualificationMetadata: {
    assetId: 'proof', expiresAt: new Date(Date.now() + 60000).toISOString(), reviewEvidence: { subjectProviderId: 'p', authorityReviewed: true },
  } };
  const ops = {
    findPackageById: async () => ({ id: 'pkg', status: 'ACTIVE', items: [{ serviceId: 'service', quantity: 1, sequence: 1 }, { serviceId: 'other', quantity: 1, sequence: 2 }] }),
    findProviderById: async () => provider,
    findAvailabilitySlotById: async () => ({ id: 'slot', providerId: 'p', serviceId: 'service', status: 'AVAILABLE', startsAt: new Date(Date.now() + 60000) }),
    findActivePricing: async () => ({ id: 'price', status: 'ACTIVE', version: 1, amountMinorUnits: '100', currencyCode: 'USD', scale: 2, effectiveFrom: new Date(0) }),
    createBookingWithCapacity: async (data) => { saved = data; return data; },
  };
  const catalog = { findById: async (id) => ({ id, status: 'PUBLISHED', serviceAvailabilityStatus: 'AVAILABLE', inputSchema: id === 'service' ? [{ key: 'answer', type: 'STRING', required: true }] : [] }) };
  const requests = { findRequestById: async () => ({ id: 'r', studentReferenceId: 'student', serviceId: 'service', requestParameters: { answer: 'original' } }) };
  await new Operations(catalog, ops, undefined, requests).createBooking({ requestId: 'r', studentReferenceId: 'student', packageId: 'pkg', packageConsent: true, providerId: 'p', slotId: 'slot', idempotencyKey: 'unique-key' });
  assert.deepEqual(saved.inputSnapshot, { service: { answer: 'original' }, other: {} });
  assert.equal(saved.serviceId, 'service'); assert.equal(saved.items.length, 2);
});
(async () => {
  let failed = 0; const started = performance.now();
  for (const [name, fn] of cases) {
    try { await fn(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.log(`FAIL ${name}: ${error.stack}`); }
  }
  console.log(`${cases.length} new isolated closure regressions; ${failed} failures; ${(performance.now() - started).toFixed(1)}ms (execution only)`);
  process.exitCode = failed ? 1 : 0;
})();
