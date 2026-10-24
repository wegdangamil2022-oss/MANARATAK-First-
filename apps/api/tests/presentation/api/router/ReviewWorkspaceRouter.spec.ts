import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ReviewWorkspaceUseCases, type ReviewWorkspaceGateway } from '@manaratak/application';
import { createReviewWorkspaceRouter } from '../../../../src/presentation/api/router/ReviewWorkspaceRouter';
describe('Review workspace HTTP boundary', () => {
  const gateway = {
    list: vi.fn(async () => ({ records: [], total: 0 })),
    synchronize: vi.fn(async () => []),
    command: vi.fn(async () => ({ saved: true })),
    history: vi.fn(async () => []),
  };
  const uc = new ReviewWorkspaceUseCases(
    gateway as unknown as ReviewWorkspaceGateway,
    { evaluatePermission: async (actor: string) => ({ isGranted: actor === 'staff' }) } as never,
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = req.headers['x-isolated-actor'] as string;
    next();
  });
  app.use('/review', createReviewWorkspaceRouter(uc));
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('rejects anonymous and denied actors before reading or writing', async () => {
    expect((await request(app).post('/review/query').send({})).status).toBe(401);
    expect(
      (await request(app).post('/review/query').set('x-isolated-actor', 'student').send({})).status,
    ).toBe(403);
    expect(gateway.list).not.toHaveBeenCalled();
  });
  it('passes private search in body and rejects unsafe filter/page/sort input', async () => {
    expect(
      (
        await request(app)
          .post('/review/query')
          .set('x-isolated-actor', 'staff')
          .send({ search: 'جامعة', pageSize: 25 })
      ).status,
    ).toBe(200);
    expect(gateway.list.mock.calls[0][1]).toMatchObject({ search: 'جامعة', pageSize: 25 });
    for (const body of [
      { pageSize: 999 },
      { sort: 'sql' },
      { domain: 'finance' },
      { search: 'x'.repeat(201) },
    ])
      expect(
        (await request(app).post('/review/query').set('x-isolated-actor', 'staff').send(body))
          .status,
      ).toBe(400);
  });
  it('requires versions and durable command keys and exposes no publish command', async () => {
    for (const body of [
      { key: 'universities:x:', action: 'publish' },
      { key: 'x', action: 'claim', version: 0 },
    ])
      expect(
        (await request(app).post('/review/commands').set('x-isolated-actor', 'staff').send(body))
          .status,
      ).toBe(400);
    expect(
      (await request(app).post('/review/publish').set('x-isolated-actor', 'staff').send({})).status,
    ).toBe(404);
    expect(gateway.command).not.toHaveBeenCalled();
  });
  it('maps stale owner data to conflict without revealing database errors', async () => {
    gateway.command.mockRejectedValueOnce(new Error('REVIEW_OWNER_CHANGED'));
    const response = await request(app)
      .post('/review/commands')
      .set('x-isolated-actor', 'staff')
      .send({
        key: 'universities:id:',
        action: 'claim',
        version: 1,
        ownerRevision: 'a'.repeat(32),
        idempotencyKey: 'c'.repeat(20),
        reason: 'Reviewing case',
      });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code: 'REVIEW_OWNER_CHANGED' } });
  });
});
