import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createTranslationWorkspaceRouter } from '../../../../src/presentation/api/router/TranslationWorkspaceRouter';
function fixture(granted: boolean) {
  const reader = {
    search: vi.fn().mockResolvedValue({ data: [], total: 80, coverageScope: 'GLOBAL' }),
  };
  const auth = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: granted }) };
  const app = express();
  app.use((req, _res, next) => {
    req.authUserId = 'reviewer';
    next();
  });
  app.use(createTranslationWorkspaceRouter(reader as any, auth as any));
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
});
