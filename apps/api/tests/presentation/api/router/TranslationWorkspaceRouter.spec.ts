import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTranslationWorkspaceRouter } from '../../../../src/presentation/api/router/TranslationWorkspaceRouter';
function fixture(granted: boolean, actorId: string | undefined = 'reviewer', writer?: any) {
  const reader = {
    search: vi.fn().mockResolvedValue({ data: [], total: 80, coverageScope: 'GLOBAL' }),
  };
  const auth = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: granted }) };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = actorId;
    next();
  });
  app.use(createTranslationWorkspaceRouter(reader as any, auth as any, writer));
  app.use((error: any, _req: any, res: any, _next: any) =>
    res.status(400).json({ code: 'INVALID_QUERY' }),
  );
  return { app, reader, auth };
}
describe('Translation workspace owner boundary', () => {
  it('denies a reader lacking the selected owner permission before any owner query', async () => {
    const f = fixture(false);
    expect((await request(f.app).get('/workspace?domain=UNIVERSITY')).status).toBe(403);
    expect(f.reader.search).not.toHaveBeenCalled();
  });
  it('sends coverage/review/time/page filters to the owner read projection', async () => {
    const f = fixture(true);
    const response = await request(f.app).get(
      '/workspace?domain=UNIVERSITY&coverage=MISSING_EN&reviewState=NEEDS_REVIEW&locale=en&page=2&updatedFrom=2026-10-01',
    );
    expect(response.status).toBe(200);
    expect(f.reader.search).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'UNIVERSITY',
        coverage: 'MISSING_EN',
        reviewState: 'NEEDS_REVIEW',
        page: 2,
        updatedFrom: expect.any(Date),
      }),
    );
    expect(f.auth.evaluatePermission).toHaveBeenCalledWith(
      'reviewer',
      'admin:universities:manage',
      expect.anything(),
    );
  });
  it('rejects unsupported owners and unbounded page requests', async () => {
    const f = fixture(true);
    expect((await request(f.app).get('/workspace?domain=STUDENT&page=10001')).status).toBe(400);
    expect(f.reader.search).not.toHaveBeenCalled();
  });
  it('validates server sorting and rejected-state filters without interpolating arbitrary SQL', async () => {
    const f = fixture(true);
    expect(
      (await request(f.app).get('/workspace?domain=UNIVERSITY&reviewState=REJECTED&sort=NAME_ASC'))
        .status,
    ).toBe(200);
    expect(f.reader.search).toHaveBeenCalledWith(
      expect.objectContaining({ reviewState: 'REJECTED', sort: 'NAME_ASC' }),
    );
    f.reader.search.mockClear();
    expect(
      (await request(f.app).get('/workspace?domain=UNIVERSITY&sort=NAME_ASC;DROP')).status,
    ).toBe(400);
    expect(f.reader.search).not.toHaveBeenCalled();
  });
  it('requires an authenticated reader and rejects repeated locale parameters before a read', async () => {
    const reader = { search: vi.fn() };
    const auth = { evaluatePermission: vi.fn() };
    const app = express();
    app.use(createTranslationWorkspaceRouter(reader as any, auth as any));
    expect((await request(app).get('/workspace?domain=MAJOR')).status).toBe(401);
    expect(reader.search).not.toHaveBeenCalled();
    const f = fixture(true);
    const response = await request(f.app).get('/workspace?domain=MAJOR&locale=ar&locale=en');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TRANSLATION_VALIDATION_ERROR');
    expect(f.reader.search).not.toHaveBeenCalled();
  });
  it('keeps publication frozen even for an authorized actor and a forged enabling request', async () => {
    const writer = { resolveExact: vi.fn(), publishApproved: vi.fn() };
    const f = fixture(true, 'publisher', writer);
    const response = await request(f.app)
      .post('/owners/UNIVERSITY/INS-X/en/publish')
      .send({ mode: 'ENABLED', actorId: 'forged', reviewedBy: 'checker', approvalId: 'copied' });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'TRANSLATION_CONTENT_AUTHORING_DISABLED' } });
    expect(writer.resolveExact).not.toHaveBeenCalled();
    expect(writer.publishApproved).not.toHaveBeenCalled();
  });
});
