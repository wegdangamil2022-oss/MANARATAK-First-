import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { NotificationDeliveryBackgroundJobHandler } from '../../packages/application/src/background-jobs/handlers/NotificationDeliveryBackgroundJobHandler';
import { ManageNotificationIntentsUseCase } from '../../packages/application/src/notification/use-cases/ManageNotificationIntentsUseCase';
import { ManageNotificationTemplatesUseCase } from '../../packages/application/src/notification/use-cases/ManageNotificationTemplatesUseCase';
import { StudentNotificationRecipientGateway } from '../../packages/application/src/students/use-cases/StudentNotificationRecipientGateway';
import { StudentApplicationReminderNotificationGateway } from '../../packages/application/src/students/use-cases/StudentApplicationReminderNotificationGateway';
import {
  PrismaNotificationIntentRepository,
  PrismaNotificationTemplateRepository,
  PrismaStudentNotificationPreferenceGateway,
} from '../../packages/infrastructure/src/notification/PrismaNotificationRepositories';
import { ProviderNotificationDeliveryGateway } from '../../packages/infrastructure/src/notification/ProviderNotificationDeliveryGateway';
import { isNotificationPreviewRequest } from '../../apps/api/src/presentation/http/NotificationPreviewRequest';
import { createCanonicalIdempotencyMiddleware } from '../../apps/api/src/presentation/middleware/CanonicalIdempotencyMiddleware';
import { MutationAuditPolicy } from '../../apps/api/src/presentation/audit/MutationAuditMiddleware';
import { NotificationRouter } from '../../apps/api/src/presentation/api/router/NotificationRouter';
import {
  NotificationTemplate,
  TemplateId,
  NotificationChannel,
  NotificationLocaleReference,
  NotificationIntent,
  NotificationId,
  NotificationReference,
  NotificationRecipientReference,
  TemplateVariable,
} from '@manaratak/domain';
const candidate = () => ({
  id: 'n1',
  reference: 'admin:n1',
  templateId: 'manual-v1',
  recipientReference: 'student-1',
  variables: { title: 'Sample', message: 'Text' },
  channels: ['EMAIL', 'IN_APP', 'PUSH'],
  attempt: 1,
  maxAttempts: 3,
  leaseToken: 'lease',
  leaseUntil: new Date(Date.now() + 600000),
});
const context = () =>
  ({ signal: new AbortController().signal, jobReference: 'j1', attempt: 1 }) as any;
const recipients = () => ({ assertEligible: vi.fn().mockResolvedValue({ locale: 'en' }) });
const template = () =>
  NotificationTemplate.create(
    TemplateId.create('manual-v1'),
    ['IN_APP', 'EMAIL'].map(NotificationChannel.create),
    ['title', 'message'],
    ['ar', 'en'].map(NotificationLocaleReference.create),
  );
function workerFixture() {
  const row = candidate(),
    terminal = new Set<string>();
  const repo = {
    claimDue: vi
      .fn()
      .mockImplementation(async () => [
        { ...row, channels: row.channels.filter((c) => !terminal.has(c)) },
      ]),
    checkpointChannel: vi.fn().mockImplementation(async (_c, ch) => {
      terminal.add(ch);
      return true;
    }),
    suppressChannel: vi.fn().mockImplementation(async (_c, ch) => {
      terminal.add(ch);
      return true;
    }),
    markDelivered: vi.fn().mockResolvedValue(true),
    markSuppressed: vi.fn().mockResolvedValue(true),
    markFailed: vi.fn().mockResolvedValue(true),
  };
  const gateway = { deliver: vi.fn().mockResolvedValue({ status: 'DELIVERED' }) };
  const prefs = { hasOptedOut: vi.fn().mockResolvedValue(false) },
    owner = recipients();
  return {
    row,
    repo,
    gateway,
    prefs,
    owner,
    handler: new NotificationDeliveryBackgroundJobHandler(
      repo as any,
      gateway as any,
      prefs as any,
      undefined,
      owner,
    ),
  };
}
describe('section 23 recipient/consent security', () => {
  it.each([
    null,
    { type: 'Human', status: 'SUSPENDED' },
    { type: 'Human', status: 'PURGED' },
    { type: 'Service', status: 'ACTIVE' },
  ])('denies unknown or inactive identities %j', async (identity) => {
    const gateway = new StudentNotificationRecipientGateway(
      { findById: vi.fn().mockResolvedValue(identity) } as any,
      { findByIdentityId: vi.fn().mockResolvedValue([{ roleId: 'student' }]) } as any,
      { findWorkspace: vi.fn().mockResolvedValue({ status: 'ACTIVE' }) } as any,
    );
    await expect(gateway.assertEligible('s')).rejects.toThrow(
      'NOTIFICATION_RECIPIENT_NOT_ELIGIBLE',
    );
  });
  it('denies revoked student roles and missing workspaces', async () => {
    const ids = { findById: vi.fn().mockResolvedValue({ type: 'Human', status: 'ACTIVE' }) },
      roles = { findByIdentityId: vi.fn().mockResolvedValue([]) },
      students = { findWorkspace: vi.fn().mockResolvedValue(null) };
    const gateway = new StudentNotificationRecipientGateway(
      ids as any,
      roles as any,
      students as any,
    );
    await expect(gateway.assertEligible('s')).rejects.toThrow();
    roles.findByIdentityId.mockResolvedValue([{ roleId: 'student' }] as any);
    await expect(gateway.assertEligible('s')).rejects.toThrow();
    students.findWorkspace.mockResolvedValue({ status: 'ACTIVE', preferredLanguage: 'en' } as any);
    expect(await gateway.assertEligible('s')).toEqual({ locale: 'en' });
  });
  it.each([
    null,
    { status: 'ACTIVE', notificationMatrix: null },
    { status: 'ACTIVE', notificationMatrix: { email: false } },
    { status: 'SUSPENDED', notificationMatrix: { email: true } },
  ])('fails closed on missing/denied preference %j', async (row) => {
    const gateway = new PrismaStudentNotificationPreferenceGateway({
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue(row) },
    } as any);
    expect(
      await gateway.hasOptedOut(
        NotificationRecipientReference.create('s'),
        NotificationChannel.create('EMAIL'),
      ),
    ).toBe(true);
  });
  it('requires explicit channel allowance', async () => {
    const gateway = new PrismaStudentNotificationPreferenceGateway({
      studentWorkspace: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ status: 'ACTIVE', notificationMatrix: { email: true } }),
      },
    } as any);
    expect(
      await gateway.hasOptedOut(
        NotificationRecipientReference.create('s'),
        NotificationChannel.create('EMAIL'),
      ),
    ).toBe(false);
  });
  it('rechecks eligibility before every outbound call', async () => {
    const f = workerFixture();
    f.owner.assertEligible.mockRejectedValue(new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE'));
    await f.handler.handle({}, context());
    expect(f.gateway.deliver).not.toHaveBeenCalled();
    expect(f.repo.markFailed).toHaveBeenCalled();
  });
  it('revocation between channels prevents subsequent sends', async () => {
    const f = workerFixture();
    f.owner.assertEligible
      .mockResolvedValueOnce({ locale: 'en' })
      .mockResolvedValueOnce({ locale: 'en' })
      .mockRejectedValue(new Error('revoked'));
    await f.handler.handle({}, context());
    expect(f.gateway.deliver.mock.calls.map((c) => c[0].channels)).toEqual([['IN_APP']]);
  });
  it('channel opt-out suppresses outbound without hiding allowed in-app', async () => {
    const f = workerFixture();
    f.prefs.hasOptedOut.mockImplementation(async (_recipient, ch) => ch.toString() !== 'IN_APP');
    await f.handler.handle({}, context());
    expect(f.gateway.deliver).toHaveBeenCalledTimes(1);
    expect(f.repo.suppressChannel).toHaveBeenCalledTimes(2);
  });
});
describe('section 23 retry and channel reliability', () => {
  it('keeps IN_APP once when EMAIL fails and retries only unfinished channels', async () => {
    const f = workerFixture();
    f.gateway.deliver.mockImplementation(async (c) => {
      if (c.channels[0] === 'EMAIL') throw new Error('private address or provider body');
      return { status: 'DELIVERED' };
    });
    await f.handler.handle({}, context());
    expect(f.repo.checkpointChannel).toHaveBeenCalledWith(
      expect.anything(),
      'IN_APP',
      expect.anything(),
      expect.any(Date),
    );
    expect(f.repo.markFailed.mock.calls[0][2]).not.toContain('private');
    f.gateway.deliver.mockResolvedValue({ status: 'DELIVERED' });
    await f.handler.handle({}, context());
    expect(f.gateway.deliver.mock.calls.filter((c) => c[0].channels[0] === 'IN_APP')).toHaveLength(
      1,
    );
    expect(
      f.gateway.deliver.mock.calls.filter((c) => c[0].channels[0] === 'EMAIL').map((c) => c[1]),
    ).toEqual(['notification:n1:EMAIL', 'notification:n1:EMAIL']);
  });
  it('lease loss prevents subsequent external channels and is not converted into success', async () => {
    const f = workerFixture();
    f.repo.checkpointChannel.mockResolvedValue(false);
    await expect(f.handler.handle({}, context())).rejects.toThrow(
      'NOTIFICATION_DELIVERY_LEASE_LOST',
    );
    expect(f.gateway.deliver).toHaveBeenCalledTimes(1);
    expect(f.repo.markDelivered).not.toHaveBeenCalled();
  });
  it('stops before sending when the claim has expired', async () => {
    const f = workerFixture();
    f.row.leaseUntil = new Date(0);
    await expect(f.handler.handle({}, context())).rejects.toThrow(
      'NOTIFICATION_DELIVERY_LEASE_LOST',
    );
    expect(f.gateway.deliver).not.toHaveBeenCalled();
  });
  it('uses the current retry epoch for backoff, keeping lifetime attempts', async () => {
    const f = workerFixture();
    Object.assign(f.row, { attempt: 12, maxAttempts: 14, epochAttempt: 1 });
    f.gateway.deliver.mockRejectedValue(new Error('failure'));
    const before = Date.now();
    await f.handler.handle({}, context());
    const call = f.repo.markFailed.mock.calls[0];
    expect(call[4]).toBe(false);
    expect(call[3].getTime() - before).toBeLessThan(1500);
  });
  it('external sends fail closed when provider reconciliation is not available', async () => {
    const f = candidate(),
      fetchImpl = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accepted: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const gateway = new ProviderNotificationDeliveryGateway({
      baseUrl: 'https://provider.example',
      apiKey: 'test',
      signingSecret: 'x'.repeat(32),
      fetchImpl,
    });
    await expect(
      gateway.deliver({ ...f, channels: ['EMAIL'] }, 'notification:n1:EMAIL'),
    ).rejects.toThrow('NOTIFICATION_PROVIDER_RECONCILIATION_REQUIRED');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('reconciles acceptance before commit without posting the same message again', async () => {
    const f = candidate(),
      key = 'notification:n1:EMAIL',
      fetchImpl = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            found: true,
            idempotencySupported: true,
            idempotencyKey: key,
            accepted: true,
            delivered: false,
            providerMessageId: 'p1',
          }),
          { status: 200 },
        ),
      );
    const gateway = new ProviderNotificationDeliveryGateway({
      baseUrl: 'https://provider.example',
      apiKey: 'test',
      signingSecret: 'x'.repeat(32),
      fetchImpl,
    });
    expect(await gateway.deliver({ ...f, channels: ['EMAIL'] }, key)).toMatchObject({
      status: 'ACCEPTED',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1].method).toBe('GET');
    expect(gateway.capabilityStatus).toBe('CONFIGURED_RUNTIME_PENDING');
  });
  it('provider cannot acknowledge a different delivery key', async () => {
    const key = 'notification:n1:EMAIL';
    let count = 0;
    const fetchImpl = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify(
              ++count === 1
                ? { found: false, idempotencySupported: true, idempotencyKey: key }
                : { accepted: true, idempotencySupported: true, idempotencyKey: 'foreign' },
            ),
            { status: 200 },
          ),
      );
    const gateway = new ProviderNotificationDeliveryGateway({
      baseUrl: 'https://provider.example',
      apiKey: 'test',
      signingSecret: 'x'.repeat(32),
      fetchImpl,
    });
    await expect(gateway.deliver({ ...candidate(), channels: ['EMAIL'] }, key)).rejects.toThrow(
      'NOTIFICATION_PROVIDER_NOT_ACCEPTED',
    );
  });
});
describe('section 23 authoring invariants', () => {
  const dto = () => ({
    id: 'n1',
    reference: 'admin:n1',
    templateId: 'manual-v1',
    recipientReference: 'student-1',
    variables: { title: 'Hi', message: 'Text' },
  });
  it.each(['https://evil.example', '//evil.example', '/\\evil', '/%2f%2fevil', '/ok\n'])(
    'rejects unsafe actionUrl %j before persistence',
    async (url) => {
      const repo = { save: vi.fn() },
        uc = new ManageNotificationIntentsUseCase(
          repo as any,
          { hasOptedOut: vi.fn().mockResolvedValue(false) },
          { findById: vi.fn().mockResolvedValue(template()) } as any,
          recipients(),
        );
      await expect(
        uc.createIntent({ ...dto(), variables: { ...dto().variables, actionUrl: url } }),
      ).rejects.toThrow('NOTIFICATION_ACTION_URL_NOT_ALLOWED');
      expect(repo.save).not.toHaveBeenCalled();
    },
  );
  it('promotional requests and sensitive variable names fail closed', async () => {
    const repo = { save: vi.fn() },
      uc = new ManageNotificationIntentsUseCase(
        repo as any,
        { hasOptedOut: vi.fn().mockResolvedValue(false) },
        { findById: vi.fn().mockResolvedValue(template()) } as any,
        recipients(),
      );
    await expect(uc.createIntent({ ...dto(), purpose: 'PROMOTIONAL' })).rejects.toThrow(
      'NOTIFICATION_PURPOSE_NOT_AUTHORIZED',
    );
    await expect(
      uc.createIntent({ ...dto(), variables: { ...dto().variables, accessToken: 'secret' } }),
    ).rejects.toThrow('NOTIFICATION_VARIABLES_NOT_ALLOWED');
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('reminder references include the tracker version and template replay is immutable', async () => {
    const intents = { createIntent: vi.fn() },
      templates = { ensureTemplate: vi.fn() },
      gateway = new StudentApplicationReminderNotificationGateway(intents as any, templates as any);
    for (const version of [1, 2])
      await gateway.schedule({
        trackerId: 't',
        trackerVersion: version,
        studentReferenceId: 's',
        scholarshipId: 'sch',
        deadlineAt: new Date(Date.now() + 10 * 86400000),
      });
    expect(intents.createIntent.mock.calls.map((c) => c[0].reference)).toEqual([
      'student-application:t:v1',
      'student-application:t:v2',
    ]);
    expect(templates.ensureTemplate).toHaveBeenCalledTimes(2);
  });
  it('immutable template bootstrap does not change an existing definition', async () => {
    const t = template(),
      upsert = vi.fn().mockResolvedValue({
        channels: ['IN_APP', 'EMAIL'],
        requiredVariables: ['title', 'message'],
        localizations: ['ar', 'en'],
        contents: null,
      });
    const repo = new PrismaNotificationTemplateRepository({
      notificationTemplateRecord: { upsert },
    } as any);
    await repo.save(t);
    expect(upsert.mock.calls[0][0].update).toEqual({});
    upsert.mockResolvedValue({ channels: ['PUSH'], requiredVariables: [], localizations: ['en'] });
    await expect(repo.save(t)).rejects.toThrow('NOTIFICATION_TEMPLATE_IMMUTABLE_CONFLICT');
  });
  it('AR/EN preview is deterministic and does not write or send', async () => {
    const t = NotificationTemplate.create(
      TemplateId.create('v2'),
      [NotificationChannel.create('IN_APP')],
      ['name'],
      ['ar', 'en'].map(NotificationLocaleReference.create),
      {
        ar: { subject: 'مرحبًا {{name}}', body: 'رسالة' },
        en: { subject: 'Hello {{name}}', body: 'Message' },
      },
    );
    const save = vi.fn(),
      uc = new ManageNotificationTemplatesUseCase({
        findById: vi.fn().mockResolvedValue(t),
        save,
      } as any);
    expect(await uc.preview('v2', { name: 'Sample' }, 'en')).toMatchObject({
      title: 'Hello Sample',
      message: 'Message',
      fallback: false,
    });
    expect(save).not.toHaveBeenCalled();
    await expect(uc.preview('v2', {}, 'ar')).rejects.toThrow(
      'NOTIFICATION_REQUIRED_VARIABLE_MISSING',
    );
  });
  it('negative stale lease cannot write a projection or channel receipt', async () => {
    const tx = {
      notificationIntentRecord: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      studentNotificationProjection: { upsert: vi.fn() },
      notificationChannelDelivery: { upsert: vi.fn() },
    };
    const repo = new PrismaNotificationIntentRepository({
      $transaction: (fn: any) => fn(tx),
    } as any);
    expect(
      await repo.checkpointChannel(candidate(), 'IN_APP', { status: 'DELIVERED' }, new Date()),
    ).toBe(false);
    expect(tx.studentNotificationProjection.upsert).not.toHaveBeenCalled();
    expect(tx.notificationChannelDelivery.upsert).not.toHaveBeenCalled();
  });
  it('projection replay rejects a different recipient without overwriting private data', async () => {
    const tx = {
      notificationIntentRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      studentNotificationProjection: {
        upsert: vi.fn().mockResolvedValue({ studentReferenceId: 'other' }),
      },
      notificationChannelDelivery: { upsert: vi.fn() },
    };
    const repo = new PrismaNotificationIntentRepository({
      $transaction: (fn: any) => fn(tx),
    } as any);
    await expect(repo.checkpointChannel(candidate(), 'IN_APP', {}, new Date())).rejects.toThrow(
      'NOTIFICATION_PROJECTION_CONFLICT',
    );
    expect(tx.studentNotificationProjection.upsert.mock.calls[0][0].update).toEqual({});
    expect(tx.notificationChannelDelivery.upsert).not.toHaveBeenCalled();
  });
});
describe('section 23 API privileges and privacy', () => {
  function api(grants: string[]) {
    const intents = {
      listIntents: vi.fn().mockResolvedValue([
        {
          id: 'n1',
          reference: 'secret-ref',
          recipientReference: 'private-student',
          createdAt: new Date(),
        },
      ]),
      retryIntent: vi.fn(),
      cancelIntent: vi.fn(),
      createIntent: vi.fn(),
      receipts: vi.fn().mockResolvedValue([]),
    };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'actor';
      next();
    });
    app.use(
      NotificationRouter.create({
        intentsUseCase: intents as any,
        templatesUseCase: { listTemplates: vi.fn().mockResolvedValue([]) } as any,
        authEvaluatorService: {
          evaluatePermission: vi
            .fn()
            .mockImplementation(async (_id, key) => ({ isGranted: grants.includes(key) })),
        } as any,
        notificationRecipientGateway: recipients(),
        studentWorkspaceRepository: {} as any,
      }),
    );
    return { app, intents };
  }
  it('viewer cannot retry, cancel or create', async () => {
    const { app, intents } = api(['admin:notifications:view']);
    for (const path of ['/intents/n1/retry', '/intents/n1/cancel', '/intents'])
      expect((await request(app).post(path).send({})).status).toBe(403);
    expect(intents.retryIntent).not.toHaveBeenCalled();
    expect(intents.cancelIntent).not.toHaveBeenCalled();
    expect(intents.createIntent).not.toHaveBeenCalled();
  });
  it('redacts recipient identifiers and references without explicit PII access', async () => {
    const { app } = api(['admin:notifications:view']);
    const response = await request(app).get('/intents');
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain('private-student');
    expect(JSON.stringify(response.body)).not.toContain('secret-ref');
    expect((await request(app).get('/recipients')).status).toBe(403);
  });
  it('invalid cursor and unbounded limits fail closed', async () => {
    const { app, intents } = api(['admin:notifications:view']);
    expect((await request(app).get('/intents?limit=10000')).status).toBe(400);
    expect((await request(app).get('/intents?cursor=bad')).status).toBe(422);
    expect(intents.listIntents).not.toHaveBeenCalled();
  });
  it('operators retry only when granted that separate capability', async () => {
    const { app, intents } = api([
      'admin:notifications:view',
      'admin:notifications:delivery:retry',
    ]);
    expect((await request(app).post('/intents/n1/retry').send({})).status).toBe(202);
    expect(intents.retryIntent).toHaveBeenCalledWith('n1');
  });
});

describe('section 23 persistence, encryption and reservation policy', () => {
  const key = '11'.repeat(32); // Synthetic test key; never read from the runtime environment.
  async function protector() {
    const { StudentPrivateResultProtector } =
      await import('../../packages/infrastructure/src/students/StudentPrivateResultProtector');
    return new StudentPrivateResultProtector('TEST_KEY', { TEST_KEY: key });
  }
  const intent = (recipient = 'student-1', message = 'Text') =>
    NotificationIntent.create(
      NotificationId.create('n1'),
      NotificationReference.create('admin:n1'),
      TemplateId.create('manual-v1'),
      NotificationRecipientReference.create(recipient),
      [TemplateVariable.create('title', 'Sample'), TemplateVariable.create('message', message)],
    );
  it('encrypts message variables, rejects changed replay and preserves terminal state after erasure', async () => {
    let saved: any;
    const upsert = vi.fn().mockImplementation(async (args) => {
      saved ??= { ...args.create, deliveryState: 'DELIVERED' };
      return saved;
    });
    const db = {
      notificationTemplateRecord: {
        findUnique: vi.fn().mockResolvedValue({ channels: ['IN_APP'] }),
      },
      notificationIntentRecord: { upsert },
    };
    Object.assign(db, {
      $transaction: (fn: any) => fn({ ...db, $queryRawUnsafe: vi.fn().mockResolvedValue([]) }),
    });
    const repo = new PrismaNotificationIntentRepository(db as any, null, await protector());
    await repo.save(intent());
    expect(saved.variables).toEqual({});
    expect(JSON.stringify(saved.variablesEncrypted)).not.toContain('Sample');
    await repo.save(intent());
    expect(saved.deliveryState).toBe('DELIVERED');
    expect(upsert.mock.calls[1][0].update).toEqual({});
    saved.variablesEncrypted = null;
    saved.payloadErasedAt = new Date();
    await repo.save(intent());
    await expect(repo.save(intent('other'))).rejects.toThrow('NOTIFICATION_INTENT_ID_CONFLICT');
    await expect(repo.save(intent('student-1', 'Changed'))).rejects.toThrow(
      'NOTIFICATION_INTENT_ID_CONFLICT',
    );
  });
  it('does not persist new plaintext when the encryption key is unavailable', async () => {
    const upsert = vi.fn(),
      repo = new PrismaNotificationIntentRepository({
        notificationIntentRecord: { upsert },
      } as any);
    await expect(repo.save(intent())).rejects.toThrow(
      'NOTIFICATION_PAYLOAD_PROTECTION_NOT_CONFIGURED',
    );
    expect(upsert).not.toHaveBeenCalled();
  });
  it('durable reservations stop a second intent for the same recipient before a receipt exists', async () => {
    let reserved = 0;
    const rows = ['a', 'b'].map((id) => ({
      id,
      reference: `admin:${id}`,
      templateId: 'manual-v1',
      recipientReference: 'student-1',
      variables: { title: 'Sample', message: 'Text' },
      channels: ['IN_APP'],
      attempts: 0,
      retryMaxRetries: 5,
      retryBackoffMs: 1000,
    }));
    const tx = {
      notificationIntentRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      notificationChannelDelivery: { findMany: vi.fn().mockResolvedValue([]) },
      notificationRateReservation: {
        count: vi.fn().mockImplementation(async () => reserved),
        create: vi.fn().mockImplementation(async () => {
          reserved++;
        }),
      },
      $queryRawUnsafe: vi
        .fn()
        .mockImplementation(async (sql) =>
          sql.includes('pg_try_advisory') ? [{ locked: true }] : rows,
        ),
    };
    const db = {
      notificationIntentRecord: { findMany: vi.fn().mockResolvedValue([]) },
      notificationRateReservation: { deleteMany: vi.fn() },
      $transaction: (fn: any) => fn(tx),
    };
    const repo = new PrismaNotificationIntentRepository(db as any, null, await protector());
    const claimed = await repo.claimDue('worker', new Date(), 20, 600000, 1);
    expect(claimed).toHaveLength(1);
    expect(tx.notificationRateReservation.create).toHaveBeenCalledTimes(1);
    expect(reserved).toBe(1);
    expect(tx.$queryRawUnsafe.mock.calls[1][0]).toContain('pg_try_advisory_xact_lock');
  });
  it('retention erases raw/encrypted body while preserving replay fingerprint and terminal receipts', async () => {
    const updateMany = vi.fn(),
      db = {
        notificationIntentRecord: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'n1',
              deliveryState: 'DEAD_LETTER',
              variables: { message: 'private' },
              variablesFingerprint: 'stable',
            },
          ]),
          updateMany,
        },
        notificationRateReservation: { deleteMany: vi.fn() },
      };
    const repo = new PrismaNotificationIntentRepository(db as any);
    await repo.purgePayloads(new Date());
    const data = updateMany.mock.calls[0][0].data;
    expect(data.variables).toEqual({});
    expect(data.variablesEncrypted).toBeDefined();
    expect(data.variablesFingerprint).toBe('stable');
    expect(data.deliveryState).toBe('EXPIRED');
    expect(JSON.stringify(data)).not.toContain('private');
  });
  it('accepted channel reconciliation never submits again when the provider loses the key', async () => {
    const key = 'notification:n1:EMAIL',
      fetchImpl = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ found: false, idempotencySupported: true, idempotencyKey: key }),
            { status: 200 },
          ),
        );
    const gateway = new ProviderNotificationDeliveryGateway({
      baseUrl: 'https://provider.example',
      apiKey: 'test',
      signingSecret: 'x'.repeat(32),
      fetchImpl,
    });
    await expect(
      gateway.deliver({ ...candidate(), channels: ['EMAIL'], acceptedChannels: ['EMAIL'] }, key),
    ).rejects.toThrow('NOTIFICATION_ACCEPTED_KEY_NOT_FOUND');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('section 23 template operations and non-sending preview', () => {
  it('deactivation rejects templates with active intents under the owner lock', async () => {
    const tx = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      notificationIntentRecord: { count: vi.fn().mockResolvedValue(1) },
      notificationTemplateRecord: { updateMany: vi.fn() },
    };
    const repo = new PrismaNotificationTemplateRepository({
      $transaction: (fn: any) => fn(tx),
    } as any);
    await expect(repo.deactivate('manual-v1', 1)).rejects.toThrow('NOTIFICATION_TEMPLATE_IN_USE');
    expect(tx.notificationTemplateRecord.updateMany).not.toHaveBeenCalled();
  });
  it('deactivation uses expected version and never rewrites template contents', async () => {
    const tx = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      notificationIntentRecord: { count: vi.fn().mockResolvedValue(0) },
      notificationTemplateRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const repo = new PrismaNotificationTemplateRepository({
      $transaction: (fn: any) => fn(tx),
    } as any);
    await repo.deactivate('manual-v1', 2);
    expect(tx.notificationTemplateRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'manual-v1', version: 2, active: true },
      data: { active: false, version: { increment: 1 } },
    });
  });
  it('only the exact read-only preview route skips idempotency persistence and mutation audit', async () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/notifications/templates/manual-v1/preview',
    } as any;
    expect(isNotificationPreviewRequest(req)).toBe(true);
    expect(MutationAuditPolicy.classify(req, 'CONTROL_PLANE')).toBe('NO_AUDIT_REQUIRED');
    const store = { claim: vi.fn() },
      next = vi.fn();
    await createCanonicalIdempotencyMiddleware({ store: store as any, requireKey: true })(
      req,
      {} as any,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(store.claim).not.toHaveBeenCalled();
    for (const originalUrl of [
      '/api/v1/notifications/intents/n1/retry',
      '/api/v1/notifications/templates/manual-v1/clone',
      '/api/v1/notifications/templates/manual-v1/preview/send',
    ]) {
      expect(isNotificationPreviewRequest({ method: 'POST', originalUrl })).toBe(false);
      expect(
        MutationAuditPolicy.classify({ method: 'POST', originalUrl } as any, 'CONTROL_PLANE'),
      ).toBe('CRITICAL_AUDIT_REQUIRED');
    }
  });
  it('historical unsafe navigation variables cannot reach a provider', async () => {
    const f = workerFixture();
    f.row.variables = { ...f.row.variables, actionUrl: 'https://evil.example' } as any;
    await f.handler.handle({}, context());
    expect(f.gateway.deliver).not.toHaveBeenCalled();
    expect(f.repo.markFailed).toHaveBeenCalled();
  });
});

describe('template JSONB replay equivalence', () => {
  it('does not treat JSONB key ordering as a template revision', async () => {
    const contents = {
      ar: { subject: 'عنوان', body: 'رسالة' },
      en: { subject: 'Title', body: 'Message' },
    };
    const t = NotificationTemplate.create(
      TemplateId.create('localized-v1'),
      [NotificationChannel.create('IN_APP')],
      [],
      ['ar', 'en'].map(NotificationLocaleReference.create),
      contents,
    );
    const upsert = vi
      .fn()
      .mockResolvedValue({
        channels: ['IN_APP'],
        requiredVariables: [],
        localizations: ['ar', 'en'],
        contents: {
          en: { body: 'Message', subject: 'Title' },
          ar: { body: 'رسالة', subject: 'عنوان' },
        },
      });
    await expect(
      new PrismaNotificationTemplateRepository({
        notificationTemplateRecord: { upsert },
      } as any).save(t),
    ).resolves.toBeUndefined();
    expect(upsert.mock.calls[0][0].update).toEqual({});
  });
});
