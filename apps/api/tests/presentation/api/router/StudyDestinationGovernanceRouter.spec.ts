import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
vi.mock('../../../../src/infrastructure/di/container.js', () => ({
  container: { resolve: vi.fn() },
}));
import { StudyDestinationAdminRouter } from '../../../../src/presentation/api/router/StudyDestinationAdminRouter';
import { StudyDestinationPublicRouter } from '../../../../src/presentation/api/router/StudyDestinationPublicRouter';
import { CANONICAL_API_REQUEST_HEADERS } from '../../../../src/presentation/security/CanonicalApiCorsPolicy';

function build(permissions: string[] = ['read', 'edit']) {
  const useCases = {
    upsertProfile: vi.fn().mockResolvedValue({ saved: true }),
    verifySources: vi.fn().mockResolvedValue({ verified: true }),
    publish: vi.fn(),
    listAdmin: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    listPublic: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getPublicBySlug: vi.fn().mockResolvedValue({ slug: 'ye' }),
  };
  const graph = { getCountryGraphByIso2Code: vi.fn().mockResolvedValue({ relationships: {} }) };
  const evaluator = {
    evaluatePermission: vi.fn(async (_actor: string, permission: string) => ({
      isGranted: permissions.includes(permission.split(':').at(-1)!),
    })),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.get('X-Test-Actor')) req.authUserId = req.get('X-Test-Actor');
    next();
  });
  app.use(
    '/admin',
    StudyDestinationAdminRouter.create(
      { studyDestinationUseCases: useCases as any, crossDomainGraphReadService: graph as any },
      evaluator as any,
    ),
  );
  app.use(
    '/public',
    StudyDestinationPublicRouter.create({ studyDestinationUseCases: useCases as any }),
  );
  app.use((err: Error, _req: any, res: any, _next: any) =>
    res.status(500).json({ error: err.message }),
  );
  return { app, useCases, graph, evaluator };
}
const command = (x: ReturnType<typeof build>) =>
  request(x.app)
    .put('/admin/YE/profile')
    .set('X-Test-Actor', 'author')
    .set('If-Match', '4')
    .set('X-Review-Reason', 'Corrected source details');
describe('Study destination authenticated HTTP contracts', () => {
  it('denies anonymous commands and separates editor/reviewer/publisher capabilities', async () => {
    const x = build();
    expect((await request(x.app).put('/admin/YE/profile').send({})).status).toBe(401);
    expect(
      (await request(x.app).post('/admin/YE/verify-source').set('X-Test-Actor', 'author').send({}))
        .status,
    ).toBe(403);
    expect(
      (await request(x.app).post('/admin/YE/publish').set('X-Test-Actor', 'author').send({}))
        .status,
    ).toBe(403);
    expect(x.useCases.verifySources).not.toHaveBeenCalled();
    expect(x.useCases.publish).not.toHaveBeenCalled();
  });
  it('rejects forged certified time and internal governance payloads', async () => {
    const x = build();
    for (const payload of [
      {
        evidenceSources: [
          {
            label: 'Evidence',
            url: 'https://education.gov.ye',
            sourceType: 'GOVERNMENT',
            verifiedAt: '2099-01-01T00:00:00.000Z',
          },
        ],
      },
      { governance: { proof: { reviewerId: 'forged' } } },
    ])
      expect((await command(x).send(payload)).status).toBe(400);
    expect(x.useCases.upsertProfile).not.toHaveBeenCalled();
  });
  it('requires a revision and preserves structured link categories and literal pipes', async () => {
    const x = build();
    expect(
      (
        await request(x.app)
          .put('/admin/YE/profile')
          .set('X-Test-Actor', 'author')
          .set('X-Review-Reason', 'Correction')
          .send({})
      ).status,
    ).toBe(428);
    const officialLinks = [
      {
        labelAr: 'جهة | رسمية',
        labelEn: 'Official | authority',
        url: 'https://education.gov.ye',
        category: 'GOVERNMENT_STUDY',
        noteEn: 'Keep | separator',
      },
    ];
    expect((await command(x).send({ officialLinks })).status).toBe(200);
    expect(x.useCases.upsertProfile).toHaveBeenCalledWith(
      'YE',
      { officialLinks },
      undefined,
      expect.objectContaining({
        actorId: 'author',
        expectedRevision: 4,
        reason: 'Corrected source details',
      }),
    );
    expect(CANONICAL_API_REQUEST_HEADERS).toEqual(
      expect.arrayContaining(['If-Match', 'X-Review-Reason']),
    );
  });
  it('accepts a multiline reason in the command body without losing the actor or precondition', async () => {
    const x = build();
    const reason = 'Reviewed official evidence\nCorrected admission requirements';
    const response = await request(x.app)
      .put('/admin/YE/profile')
      .set('X-Test-Actor', 'author')
      .set('If-Match', '4')
      .send({ reason, overviewEn: 'Updated overview' });
    expect(response.status).toBe(200);
    expect(x.useCases.upsertProfile).toHaveBeenCalledWith(
      'YE',
      { overviewEn: 'Updated overview' },
      undefined,
      expect.objectContaining({ actorId: 'author', expectedRevision: 4, reason }),
    );
  });
  it('forwards missing checks, independent edge cursors and bounded public filters', async () => {
    const x = build();
    expect(
      (await request(x.app).get('/admin?missingCheck=image&page=2').set('X-Test-Actor', 'reader'))
        .status,
    ).toBe(200);
    expect(x.useCases.listAdmin).toHaveBeenCalledWith({ missingCheck: 'image', page: 2 });
    await request(x.app)
      .get('/admin/YE/relationships?universityCursor=next&programCursor=prog&testPage=2')
      .set('X-Test-Actor', 'reader');
    expect(x.graph.getCountryGraphByIso2Code).toHaveBeenCalledWith('YE', {
      universityCursor: 'next',
      programCursor: 'prog',
      testPage: 2,
    });
    const response = await request(x.app).get('/public?q=Yemen&region=Asia&page=3&pageSize=20');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(x.useCases.listPublic).toHaveBeenCalledWith({
      q: 'Yemen',
      region: 'Asia',
      page: 3,
      pageSize: 20,
    });
    expect((await request(x.app).get('/public?pageSize=1000')).status).toBe(400);
  });
});
