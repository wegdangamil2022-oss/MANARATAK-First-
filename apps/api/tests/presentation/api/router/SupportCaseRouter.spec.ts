import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SupportCaseRouter } from '../../../../src/presentation/api/router/SupportCaseRouter';
function setup(permissions: string[] = [], student = false) {
  const uc = {
    readiness: vi.fn(async () => ({
      ready: true,
      missingTables: [],
      missingPrivileges: [],
      missingGuards: [],
      attachments: false,
    })),
    access: vi.fn(
      async (actorId: string, kind: string, allTeams: boolean, internalNotes: boolean) => ({
        actorId,
        kind,
        allTeams,
        internalNotes,
        teamIds: [],
      }),
    ),
    list: vi.fn(async () => ({ items: [], nextCursor: null })),
    get: vi.fn(async () => ({ id: 'ticket' })),
    messages: vi.fn(async () => ({ items: [], nextCursor: null })),
    events: vi.fn(async () => ({ items: [], nextCursor: null })),
    reply: vi.fn(async () => ({ record: { id: 'ticket' } })),
    create: vi.fn(async () => ({ record: { id: 'ticket' } })),
    change: vi.fn(),
    metrics: vi.fn(),
    configuration: vi.fn(),
    saveConfiguration: vi.fn(),
  };
  const evaluator = {
      evaluatePermission: vi.fn(async (_id: string, key: string) => ({
        isGranted: permissions.includes(key),
      })),
    },
    audit = { save: vi.fn(async () => {}) },
    app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = student ? 'student-session' : 'agent-session';
    next();
  });
  app.use(
    '/support',
    SupportCaseRouter.create(
      {
        supportCaseUseCases: uc as never,
        authEvaluatorService: evaluator as never,
        auditRecordRepo: audit as never,
        supportAgentChoices: vi.fn(async () => []),
      },
      student,
    ),
  );
  app.use((_e: unknown, _req: unknown, res: express.Response, _next: unknown) =>
    res.status(500).json({ error: 'TEST_OWNER_FAILED' }),
  );
  return { app, uc, evaluator, audit };
}
const view = 'admin:students:support:cases:view';
describe('support HTTP ownership and permission boundaries', () => {
  it('does not turn existing directory permission into private ticket access', async () => {
    const s = setup(['admin:students:support']);
    expect((await request(s.app).get('/support/cases')).status).toBe(403);
    expect(s.uc.list).not.toHaveBeenCalled();
  });
  it('requires separate reply and note permissions after view permission', async () => {
    const s = setup([view]);
    for (const internal of [true, false])
      expect(
        (
          await request(s.app)
            .post('/support/cases/ticket/messages')
            .set('Idempotency-Key', 'support-test-key')
            .send({ body: 'message', expectedVersion: 1, internal })
        ).status,
      ).toBe(403);
    expect(s.uc.reply).not.toHaveBeenCalled();
  });
  it('allows a note writer without implicitly allowing public replies', async () => {
    const s = setup([view, 'admin:students:support:cases:notes']);
    expect(
      (
        await request(s.app)
          .post('/support/cases/ticket/messages')
          .set('Idempotency-Key', 'support-test-key')
          .send({ body: 'internal', expectedVersion: 1, internal: true })
      ).status,
    ).toBe(201);
    expect(s.uc.reply).toHaveBeenCalledWith(
      'ticket',
      expect.objectContaining({ internal: true }),
      expect.objectContaining({ internalNotes: true, allTeams: false }),
      expect.objectContaining({ actorId: 'agent-session' }),
    );
  });
  it('rejects student owner spoofing and internal fields before any write', async () => {
    const s = setup([], true);
    expect(
      (
        await request(s.app)
          .post('/support/cases')
          .set('Idempotency-Key', 'support-test-key')
          .send({ title: 'Help please', body: 'Question', category: 'OTHER', studentId: 'victim' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(s.app)
          .post('/support/cases/ticket/messages')
          .set('Idempotency-Key', 'support-test-key')
          .send({ body: 'private', internal: true })
      ).status,
    ).toBe(400);
    expect(s.uc.create).not.toHaveBeenCalled();
    expect(s.uc.reply).not.toHaveBeenCalled();
  });
  it('does not expose events, settings or agent selection to students', async () => {
    const s = setup([], true);
    for (const path of ['/cases/ticket/events', '/configuration', '/agents'])
      expect((await request(s.app).get('/support' + path)).status).toBe(404);
    expect(s.uc.events).not.toHaveBeenCalled();
  });
  it('keeps student ownership server-derived on queries', async () => {
    const s = setup([], true);
    expect((await request(s.app).get('/support/cases?studentId=victim')).status).toBe(400);
    expect((await request(s.app).get('/support/cases')).status).toBe(200);
    expect(s.uc.access).toHaveBeenCalledWith('student-session', 'STUDENT', false, false);
  });
  it('fails closed if recording sensitive read access fails', async () => {
    const s = setup([view]);
    s.audit.save.mockRejectedValue(Error('AUDIT_DOWN'));
    expect((await request(s.app).get('/support/cases')).status).toBe(500);
    expect(s.uc.list).not.toHaveBeenCalled();
  });
  it('requires a durable command key for settings and messages', async () => {
    const s = setup([view, 'admin:students:support:cases:reply']);
    expect(
      (
        await request(s.app)
          .post('/support/cases/ticket/messages')
          .send({ body: 'message', expectedVersion: 1 })
      ).status,
    ).toBe(400);
    expect(s.uc.reply).not.toHaveBeenCalled();
  });
  it('keeps assignment and state changes separately authorized', async () => {
    const s = setup([view, 'admin:students:support:cases:assign']);
    expect(
      (
        await request(s.app)
          .patch('/support/cases/ticket')
          .set('Idempotency-Key', 'support-test-key')
          .send({ expectedVersion: 1, status: 'CLOSED', reason: 'Change state' })
      ).status,
    ).toBe(403);
    expect(s.uc.change).not.toHaveBeenCalled();
  });
});
