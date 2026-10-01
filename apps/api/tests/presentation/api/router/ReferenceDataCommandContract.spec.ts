import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaApiIdempotencyStore, ApiIdempotencyBeginInput, ApiIdempotencyBeginDecision } from '@manaratak/infrastructure';
import { SecurityService } from '../../../../../../packages/infrastructure/src/security/SecurityService';
import { ReferenceDataAdminRouter } from '../../../../src/presentation/api/router/ReferenceDataAdminRouter';
import { createCanonicalIdempotencyMiddleware } from '../../../../src/presentation/middleware/CanonicalIdempotencyMiddleware';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';

function fixture() {
  const records = new Map<string, { fingerprint: string; statusCode?: number; responseBody?: unknown }>();
  const store = {
    async begin(input: ApiIdempotencyBeginInput): Promise<ApiIdempotencyBeginDecision> {
      const existing = records.get(input.scopeHash);
      if (existing) {
        if (existing.fingerprint !== input.requestFingerprint) return { kind: 'CONFLICT' };
        if (existing.statusCode !== undefined) return { kind: 'REPLAY', statusCode: existing.statusCode, responseBody: existing.responseBody };
        return { kind: 'IN_PROGRESS' };
      }
      records.set(input.scopeHash, { fingerprint: input.requestFingerprint });
      return { kind: 'STARTED', scopeHash: input.scopeHash, leaseToken: 'memory-lease' };
    },
    async complete(result: { scopeHash: string; statusCode: number; responseBody: unknown }) {
      Object.assign(records.get(result.scopeHash)!, { statusCode: result.statusCode, responseBody: result.responseBody });
    },
  };
  const security = new SecurityService(undefined, { signingSecret: 'source-only-test-signing-secret-32-chars' });
  const session = 'test-refresh-session'; const csrf = security.generateCsrfToken(session);
  const upsertCountry = vi.fn(async (body: unknown) => body);
  const app = express(); app.use(express.json());
  app.use(SecurityMiddlewareFactory.createCsrfGuard(security));
  app.use((req, _res, next) => { req.authUserId = req.header('X-Test-Principal') || 'verified-admin'; next(); });
  app.use('/api/v1/admin/reference-data', createCanonicalIdempotencyMiddleware({ store: store as unknown as PrismaApiIdempotencyStore, requireKey: true }), ReferenceDataAdminRouter.create({ referenceDataUseCases: { upsertCountry } as any }));
  const send = (name: string, key = 'country-command-1', principal = 'verified-admin') => request(app).put('/api/v1/admin/reference-data/countries/YE')
    .set('Cookie', `manaratak_refresh=${session}`).set('X-CSRF-Token', csrf).set('X-Test-Principal', principal).set('Idempotency-Key', key).send({ iso3Code: 'YEM', name });
  return { app, send, upsertCountry, csrf, session };
}

describe('ReferenceData CSRF/idempotency command contract with memory adapters', () => {
  it('replays the same key and payload without executing a second write', async () => {
    const f = fixture(); const first = await f.send('Yemen'); const replay = await f.send('Yemen');
    expect(first.status).toBe(200); expect(replay.status).toBe(200); expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body); expect(f.upsertCountry).toHaveBeenCalledOnce();
  });
  it('rejects a changed payload under the same key without a second write', async () => {
    const f = fixture(); await f.send('Yemen'); const conflict = await f.send('Changed');
    expect(conflict.status).toBe(409); expect(conflict.body.code).toBe('IDEMPOTENCY_KEY_PAYLOAD_CONFLICT'); expect(f.upsertCountry).toHaveBeenCalledOnce();
  });
  it('scopes the same semantic key to its authenticated principal', async () => {
    const f = fixture(); await f.send('Yemen'); const other = await f.send('Yemen', 'country-command-1', 'other-verified-admin');
    expect(other.status).toBe(200); expect(f.upsertCountry).toHaveBeenCalledTimes(2);
  });
  it('rejects missing idempotency after valid CSRF before executing the use case', async () => {
    const f = fixture(); const response = await request(f.app).put('/api/v1/admin/reference-data/countries/YE').set('Cookie', `manaratak_refresh=${f.session}`).set('X-CSRF-Token', f.csrf).send({ iso3Code: 'YEM', name: 'Yemen' });
    expect(response.status).toBe(400); expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED'); expect(f.upsertCountry).not.toHaveBeenCalled();
  });
  it('rejects missing or foreign-session CSRF before executing the use case', async () => {
    const f = fixture();
    for (const [session, token] of [[f.session, undefined], ['other-session', f.csrf]]) {
      const command = request(f.app).put('/api/v1/admin/reference-data/countries/YE')
        .set('Idempotency-Key', 'command-1').set('Cookie', `manaratak_refresh=${session}`);
      if (token) command.set('X-CSRF-Token', token);
      const response = await command.send({ iso3Code: 'YEM', name: 'Yemen' });
      expect(response.status).toBe(403); expect(f.upsertCountry).not.toHaveBeenCalled();
    }
  });
});
