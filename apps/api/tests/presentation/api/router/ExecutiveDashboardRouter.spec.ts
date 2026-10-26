import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createExecutiveDashboardRouter } from '../../../../src/presentation/api/router/ExecutiveDashboardRouter';
import { createPublicAnalyticsRouter } from '../../../../src/presentation/api/router/PublicAnalyticsRouter';
import { createManagedApplicationEvidenceRouter } from '../../../../src/presentation/api/router/ManagedApplicationEvidenceRouter';
import { PublicAnalyticsUseCases } from '@manaratak/application';
import { ANALYTICS_POLICY_VERSION } from '@manaratak/shared';
function app(router: express.Router, authenticated = true) {
  const result = express();
  result.use(express.json());
  result.use((req, _res, next) => {
    if (authenticated) req.authUserId = 'staff';
    next();
  });
  result.use(router);
  return result;
}
describe('Executive aggregate authorization and input boundaries', () => {
  it('requires current authentication and dedicated permission before any data read', async () => {
    const gateway = { users: vi.fn(), traffic: vi.fn(), applications: vi.fn() },
      evaluator = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: false }) };
    const router = createExecutiveDashboardRouter(gateway as never, evaluator as never);
    expect((await request(app(router, false)).get('/users')).status).toBe(401);
    for (const source of ['users', 'traffic', 'applications'])
      expect((await request(app(router)).get('/' + source)).status).toBe(403);
    expect(gateway.users).not.toHaveBeenCalled();
    expect(gateway.traffic).not.toHaveBeenCalled();
    expect(gateway.applications).not.toHaveBeenCalled();
  });
  it('permits bounded windows only, rejects unknown query fields and disables shared caches', async () => {
    const useCases = {
        users: vi.fn().mockResolvedValue({ aggregate: true }),
        traffic: vi.fn(),
        applications: vi.fn(),
      },
      evaluator = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: true }) },
      server = app(createExecutiveDashboardRouter(useCases as never, evaluator as never));
    for (const days of [7, 30, 90, 365]) {
      const response = await request(server).get('/users?days=' + days);
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(useCases.users).toHaveBeenLastCalledWith(days);
    }
    expect((await request(server).get('/users?days=366')).status).toBe(400);
    expect((await request(server).get('/users?days=7&studentId=private')).status).toBe(400);
    useCases.users.mockRejectedValueOnce(new Error('storage details must stay private'));
    const failure = await request(server).get('/users');
    expect(failure.status).toBe(503);
    expect(JSON.stringify(failure.body)).not.toContain('storage details');
  });
});
describe('Public event shape and policy gates', () => {
  const store = () => ({
    grant: vi.fn(),
    record: vi.fn().mockResolvedValue('recorded'),
    withdraw: vi.fn(),
    purgeExpired: vi.fn(),
  });
  it('rejects secret/PII/raw URL fields and known bots without persisting them', async () => {
    const gateway = store(),
      server = app(createPublicAnalyticsRouter(new PublicAnalyticsUseCases(gateway, true)), false);
    const event = {
      token: 'a'.repeat(64),
      eventId: '92c231b7-0914-42f7-b05c-79e5c3c8310a',
      kind: 'page_view',
      pageKey: 'home',
    };
    expect(
      (
        await request(server)
          .post('/events')
          .send({ ...event, email: 'private@example.test' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(server)
          .post('/events')
          .send({ ...event, url: 'https://site.test/?token=secret' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(server)
          .post('/events')
          .send({ ...event, pageKey: 'student' })
      ).status,
    ).toBe(400);
    expect(
      (await request(server).post('/events').set('User-Agent', 'Googlebot').send(event)).body
        .result,
    ).toBe('excluded');
    expect(
      (await request(server).post('/events').set('Sec-GPC', '1').send(event)).body.result,
    ).toBe('excluded');
    expect(gateway.record).not.toHaveBeenCalled();
    expect(
      (await request(server).post('/events').set('User-Agent', 'Mozilla/5.0').send(event)).status,
    ).toBe(202);
    expect(gateway.record).toHaveBeenCalledTimes(1);
  });
  it('does not accept a generic preference as consent and permits revocation when collection is off', async () => {
    const gateway = store(),
      server = app(createPublicAnalyticsRouter(new PublicAnalyticsUseCases(gateway, false)), false);
    expect((await request(server).get('/configuration')).body.enabled).toBe(false);
    expect(
      (
        await request(server)
          .post('/consent')
          .send({ policyVersion: ANALYTICS_POLICY_VERSION, consent: true })
      ).status,
    ).toBe(503);
    expect(
      (
        await request(server)
          .post('/withdraw')
          .send({ token: 'a'.repeat(64) })
      ).status,
    ).toBe(204);
    expect(gateway.withdraw).toHaveBeenCalled();
    expect(gateway.grant).not.toHaveBeenCalled();
  });
});
describe('Managed application evidence belongs to the service owner', () => {
  const requestId = '340bce3c-66d4-4dc9-9491-263a8425af29';
  it('denies cross-assignment even when the actor has the fulfill action; no proof is recorded', async () => {
    const useCases = { append: vi.fn(), evidenceAssets: vi.fn() },
      evaluator = {
        evaluatePermission: vi
          .fn()
          .mockImplementation((_actor, p) =>
            Promise.resolve({ isGranted: p !== 'admin:services:requests:all' }),
          ),
      },
      requests = {
        findRequestById: vi.fn().mockResolvedValue({ assignedStaffId: 'another-staff' }),
      };
    const response = await request(
      app(
        createManagedApplicationEvidenceRouter(
          useCases as never,
          evaluator as never,
          requests as never,
        ),
      ),
    )
      .post(`/requests/${requestId}/application-evidence`)
      .set('Idempotency-Key', 'command-one')
      .send({ kind: 'NEEDS_INFORMATION', expectedVersion: 1 });
    expect(response.status).toBe(403);
    expect(useCases.append).not.toHaveBeenCalled();
  });
  it('requires separate proof-verification capability and rejects forged client actor IDs', async () => {
    const useCases = { append: vi.fn(), evidenceAssets: vi.fn() },
      evaluator = {
        evaluatePermission: vi
          .fn()
          .mockImplementation((_actor, p) =>
            Promise.resolve({ isGranted: p !== 'admin:services:applications:verify' }),
          ),
      },
      requests = { findRequestById: vi.fn().mockResolvedValue({ assignedStaffId: 'staff' }) },
      server = app(
        createManagedApplicationEvidenceRouter(
          useCases as never,
          evaluator as never,
          requests as never,
        ),
      );
    expect(
      (
        await request(server)
          .post(`/requests/${requestId}/application-evidence`)
          .set('Idempotency-Key', 'command-one')
          .send({ kind: 'UNIVERSITY_SUBMITTED', expectedVersion: 1, evidenceAssetId: requestId })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(server)
          .post(`/requests/${requestId}/application-evidence`)
          .set('Idempotency-Key', 'command-two')
          .send({ kind: 'NEEDS_INFORMATION', expectedVersion: 1, actorId: 'owner' })
      ).status,
    ).toBe(400);
    expect(useCases.append).not.toHaveBeenCalled();
  });
});
