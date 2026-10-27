import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { NotificationRouter } from '../../apps/api/src/presentation/api/router/NotificationRouter';
import {
  PrismaNotificationIntentRepository,
  PrismaNotificationTemplateRepository,
} from '../../packages/infrastructure/src/notification/PrismaNotificationRepositories';
function app(permissions: string[]) {
  const intents = {
    detail: vi.fn().mockResolvedValue({
      id: 'n',
      reference: 'private-reference',
      recipientReference: 'private-student',
      templateId: 't',
      channels: ['IN_APP'],
    }),
  };
  const templates = {
    detail: vi.fn().mockResolvedValue({
      id: 't',
      active: false,
      version: 2,
      contents: { ar: { subject: 'عنوان', body: 'نص' } },
    }),
    listTemplates: vi.fn().mockResolvedValue([]),
    preview: vi.fn().mockResolvedValue({ title: 'Sample', message: 'Text', locale: 'en' }),
  };
  const api = express();
  api.use(express.json());
  api.use((req, _res, next) => {
    req.authUserId = 'operator';
    next();
  });
  api.use(
    NotificationRouter.create({
      intentsUseCase: intents as any,
      templatesUseCase: templates as any,
      authEvaluatorService: {
        evaluatePermission: vi.fn(async (_user, key) => ({ isGranted: permissions.includes(key) })),
      } as any,
      notificationRecipientGateway: {} as any,
      studentWorkspaceRepository: {} as any,
    }),
  );
  return { api, intents, templates };
}
describe('Notification workspace read boundaries', () => {
  it('allows an individual-intent operator to preview a manual template only with recipient access', async () => {
    const permissions = [
      'admin:notifications:view',
      'admin:notifications:intents:create',
      'admin:notifications:recipients:pii',
    ];
    expect(
      (
        await request(app(permissions).api)
          .post('/templates/manual.t/preview')
          .send({ locale: 'ar', variables: {} })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app(permissions.slice(0, 2)).api)
          .post('/templates/manual.t/preview')
          .send({ locale: 'ar', variables: {} })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app(permissions).api)
          .post('/templates/system.t/preview')
          .send({ locale: 'ar', variables: {} })
      ).status,
    ).toBe(422);
  });
  it('returns a real next cursor only when another page exists and rejects invalid cursors', async () => {
    const { api, templates } = app(['admin:notifications:view']);
    templates.listTemplates.mockResolvedValue([
      { id: 'a', updatedAt: new Date('2026-10-27T00:00:00Z') },
      { id: 'b', updatedAt: new Date('2026-10-26T00:00:00Z') },
    ] as never);
    const res = await request(api).get('/templates?limit=1');
    expect(res.body.items).toHaveLength(1);
    expect(JSON.parse(Buffer.from(res.body.nextCursor, 'base64url').toString()).id).toBe('a');
    expect((await request(api).get('/templates?cursor=invalid')).status).toBe(422);
  });
  it('provides an exact deep-link read, masking recipient and reference without PII capability', async () => {
    const { api, intents } = app(['admin:notifications:view']);
    const res = await request(api).get('/intents/n');
    expect(res.status).toBe(200);
    expect(intents.detail).toHaveBeenCalledWith('n');
    expect(res.body.recipientReference).toBe('[REDACTED]');
    expect(res.body.reference).toBe('[REDACTED]');
  });
  it('denies details without view, and reveals only allowed references with PII', async () => {
    expect((await request(app([]).api).get('/intents/n')).status).toBe(403);
    const res = await request(
      app(['admin:notifications:view', 'admin:notifications:recipients:pii']).api,
    ).get('/intents/n');
    expect(res.body.recipientReference).toBe('private-student');
  });
  it('does not disclose template contents without author capability', async () => {
    const reader = await request(app(['admin:notifications:view']).api).get('/templates/t');
    expect(reader.status).toBe(200);
    expect(reader.body.contents).toBeUndefined();
    expect(reader.body.active).toBe(false);
    const author = await request(
      app(['admin:notifications:view', 'admin:notifications:templates:author']).api,
    ).get('/templates/t');
    expect(author.body.contents.ar.subject).toBe('عنوان');
  });
  it('applies bounded template search/filter and cursor at the server', async () => {
    const { api, templates } = app(['admin:notifications:view']);
    const cursor = Buffer.from(
      JSON.stringify({ id: 't', updatedAt: '2026-10-27T00:00:00.000Z' }),
    ).toString('base64url');
    const res = await request(api).get('/templates').query({
      limit: 25,
      search: 'manual',
      active: 'true',
      channel: 'EMAIL',
      locale: 'ar',
      cursor,
    });
    expect(res.status).toBe(200);
    expect(templates.listTemplates).toHaveBeenCalledWith(
      26,
      expect.objectContaining({
        search: 'manual',
        active: true,
        channel: 'EMAIL',
        locale: 'ar',
        after: { id: 't', updatedAt: new Date('2026-10-27T00:00:00Z') },
      }),
    );
  });
});
describe('Notification safe persistence projections', () => {
  it('uses explicit safe select for intent detail and does not decrypt message payloads', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ id: 'n', channelsSnapshot: ['EMAIL'], deliveryState: 'PENDING' });
    const repo = new PrismaNotificationIntentRepository({
      notificationIntentRecord: { findUnique },
    } as any);
    const result = await repo.detail('n');
    const select = findUnique.mock.calls[0][0].select;
    expect(select.variablesEncrypted).toBeUndefined();
    expect(select.variables).toBeUndefined();
    expect(select.lastErrorMessage).toBeUndefined();
    expect(select.contentsSnapshot).toBeUndefined();
    expect(result?.channels).toEqual(['EMAIL']);
  });
  it('returns inactive template details separately from the active delivery lookup', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ id: 't', active: false, version: 2, _count: { intents: 9 } });
    const repo = new PrismaNotificationTemplateRepository({
      notificationTemplateRecord: { findUnique },
    } as any);
    expect(await repo.detail('t')).toMatchObject({ active: false, usageCount: 9 });
  });
});
