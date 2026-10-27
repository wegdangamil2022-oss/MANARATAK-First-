import express from 'express';
import request from 'supertest';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { CertificateAdminRouter } from '../../../../src/presentation/api/router/CertificateAdminRouter';
import type { CertificateUseCases, CertificateWorkspaceReadGateway } from '@manaratak/application';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';
let allowed: Set<string>, read: ReturnType<typeof vi.fn>, versions: ReturnType<typeof vi.fn>;
function app(authenticated = true, configured = true) {
  const app = express();
  app.use((req, _res, next) => {
    if (authenticated) req.authUserId = 'fixture-reviewer';
    next();
  });
  app.use(
    CertificateAdminRouter.create({
      certificateUseCases: {} as CertificateUseCases,
      authEvaluatorService: {
        evaluatePermission: async (_actor: string, permission: string) => ({
          isGranted: allowed.has(permission),
        }),
      } as unknown as AuthorizationEvaluatorService,
      ...(configured
        ? {
            certificateWorkspaceReadGateway: {
              read,
              templateVersions: versions,
            } as CertificateWorkspaceReadGateway,
          }
        : {}),
    }),
  );
  return app;
}
beforeEach(() => {
  versions = vi.fn(async (query) => ({ data: [], total: 9, ...query }));
  allowed = new Set(['admin:certificates:view', 'admin:certificates:templates:approve']);
  read = vi.fn(async (query) => ({
    data: [
      {
        id: 'template',
        title: 'Template review',
        status: 'PENDING_APPROVAL',
        updatedAt: new Date('2026-10-27T12:00:00Z'),
        path: '/certificates/templates/template',
      },
    ],
    total: 71,
    ...query,
  }));
});
describe('Certificate owner worklist authorization and bounds', () => {
  it('reads bounded historical versions with server search under certificate view permission', async () => {
    allowed = new Set(['admin:certificates:view']);
    const id = '11111111-1111-4111-8111-111111111111';
    const response = await request(app())
      .get('/templates/' + id + '/versions?page=2&pageSize=10&search=1.0')
      .expect(200);
    expect(versions).toHaveBeenCalledWith({ templateId: id, page: 2, pageSize: 10, search: '1.0' });
    expect(response.body.total).toBe(9);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('rejects a malformed template ID and oversize historical-version page before storage', async () => {
    await request(app()).get('/templates/not-a-uuid/versions').expect(400);
    await request(app())
      .get('/templates/11111111-1111-4111-8111-111111111111/versions?pageSize=51')
      .expect(400);
    expect(versions).not.toHaveBeenCalled();
  });
  it('bootstraps a new template without requiring an existing-version precondition', async () => {
    const create = vi.fn(async () => ({ id: 'new-template', status: 'DRAFT' }));
    const server = express();
    server.use(express.json(), (req, _res, next) => {
      req.authUserId = 'fixture-author';
      next();
    });
    server.use(
      CertificateAdminRouter.create({
        certificateUseCases: {
          bootstrapDefaultCourseTemplateDraft: create,
        } as unknown as CertificateUseCases,
        authEvaluatorService: {
          evaluatePermission: async () => ({ isGranted: true }),
        } as unknown as AuthorizationEvaluatorService,
      }),
    );
    await request(server)
      .post('/templates/bootstrap-default')
      .send({ issuerId: '11111111-1111-4111-8111-111111111111' })
      .expect(201);
    expect(create).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({ actorId: 'fixture-author' }),
    );
  });
  it('requires canonical authentication before reading', async () => {
    await request(app(false)).get('/workspace?kind=templates').expect(401);
    expect(read).not.toHaveBeenCalled();
  });
  it('does not substitute general view permission for an approval permission', async () => {
    allowed.delete('admin:certificates:templates:approve');
    await request(app()).get('/workspace?kind=templates').expect(403);
    expect(read).not.toHaveBeenCalled();
  });
  it.each(['issuers', 'delegations', 'corrections', 'revalidation', 'recovery'])(
    'does not leak the %s worklist to a template reviewer',
    async (kind) => {
      await request(app())
        .get('/workspace?kind=' + kind)
        .expect(403);
      expect(read).not.toHaveBeenCalled();
    },
  );
  it('passes bounded server pagination and a true total without cache', async () => {
    const result = await request(app())
      .get('/workspace?kind=templates&page=3&pageSize=25')
      .expect(200);
    expect(read).toHaveBeenCalledWith({ kind: 'templates', page: 3, pageSize: 25 });
    expect(result.body.total).toBe(71);
    expect(result.headers['cache-control']).toBe('no-store');
  });
  it.each([
    'kind=unknown',
    'kind=templates&page=0',
    'kind=templates&pageSize=51',
    'kind=templates&actorId=someone',
  ])('rejects invalid or unowned query fields: %s', async (query) => {
    await request(app())
      .get('/workspace?' + query)
      .expect(400);
    expect(read).not.toHaveBeenCalled();
  });
  it('reports unavailable projection instead of fabricating an empty worklist', async () => {
    await request(app(true, false)).get('/workspace?kind=templates').expect(503);
  });
  it('authorizes recovery with lifecycle management, not approvals', async () => {
    allowed = new Set(['admin:certificates:view', 'admin:certificates:lifecycle:manage']);
    await request(app()).get('/workspace?kind=recovery').expect(200);
    await request(app()).get('/workspace?kind=corrections').expect(403);
  });
});
