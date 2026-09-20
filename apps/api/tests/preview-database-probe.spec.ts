import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), query: vi.fn(), disconnect: vi.fn(), construct: vi.fn(),
}));
vi.mock('@prisma/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('@prisma/client')>(),
  PrismaClient: class {
    constructor(options: unknown) { mocks.construct(options); }
    $connect = mocks.connect;
    $queryRaw = mocks.query;
    $disconnect = mocks.disconnect;
  },
}));
import { probePreviewDatabase, probePreviewDirectDatabase, probePreviewDatabaseSchema } from '../src/infrastructure/runtime/PreviewDatabaseProbe.js';
import { createPreviewAvailabilityApp } from '../src/infrastructure/runtime/PreviewAvailabilityApp.js';
// Load the mocked resource authority during suite setup, not inside the first timed query test.
import '../src/infrastructure/runtime/RuntimeResourceRegistry.js';

const env = { VERCEL: '1', VERCEL_ENV: 'preview', MANARATAK_PREVIEW_DATABASE_PROBE: 'true',
  DATABASE_URL: 'postgresql://user:private-test-password@database.invalid:6543/test',
  DIRECT_URL: 'postgresql://direct-user:direct-private-password@direct.invalid:5432/direct-test' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.connect.mockResolvedValue(undefined);
  mocks.query.mockResolvedValue([{ '?column?': 1 }]);
  mocks.disconnect.mockResolvedValue(undefined);
});

describe('Preview direct connection and schema inventory', () => {
  const probes = [probePreviewDatabase, probePreviewDirectDatabase, probePreviewDatabaseSchema];
  const paths = ['/api/v1/monitoring/health/database', '/api/v1/monitoring/health/database/direct',
    '/api/v1/monitoring/health/database/schema'];
  const expectedNames = Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name);

  function inventory(names: string[], exists = true, count = 0) {
    mocks.query.mockResolvedValueOnce([{ exists }]);
    mocks.query.mockResolvedValueOnce(names.map((name) => ({ name })));
    if (names.includes('_prisma_migrations')) mocks.query.mockResolvedValueOnce([{ count }]);
  }

  it('overrides Prisma 5.22 datasource with DIRECT_URL, never DATABASE_URL', async () => {
    expect(await probePreviewDirectDatabase({ ...env, DATABASE_URL: undefined })).toMatchObject({ status: 'UP' });
    const options = mocks.construct.mock.calls[0][0];
    const actual = new URL(options.datasources.db.url);
    const direct = new URL(env.DIRECT_URL);
    for (const field of ['hostname', 'port', 'username', 'password', 'pathname'] as const) {
      expect(actual[field]).toBe(direct[field]);
    }
    expect(options.log).toEqual([]);
    expect(mocks.query.mock.calls).toHaveLength(1);
    expect([...mocks.query.mock.calls[0][0]]).toEqual(['SELECT 1']);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it.each([undefined, '', 'invalid', 'https://direct.invalid'])('does not fall back from invalid DIRECT_URL (%s)', async (DIRECT_URL) => {
    expect((await probePreviewDirectDatabase({ ...env, DIRECT_URL })).status).toBe('DOWN');
    expect(mocks.construct).not.toHaveBeenCalled();
  });

  it.each([true, false])('reports an empty database from catalogs (public exists: %s)', async (exists) => {
    inventory([], exists);
    expect(await probePreviewDatabaseSchema(env)).toMatchObject({
      status: 'UP', publicSchemaExists: exists, prismaMigrationsTableExists: false,
      migrationCount: 0, publicTableCount: 0, manaratakTableCount: 0,
      expectedManaratakTableCount: expectedNames.length,
      missingManaratakTableCount: expectedNames.length, manaratakSchemaProvisioned: false,
    });
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mocks.query.mock.calls)).not.toContain('FROM public.');
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('counts migration records only when the table exists and recognizes all mapped model tables', async () => {
    inventory([...expectedNames, '_prisma_migrations'], true, 17);
    const result = await probePreviewDatabaseSchema(env);
    expect(result).toMatchObject({
      status: 'UP', prismaMigrationsTableExists: true, migrationCount: 17,
      publicTableCount: expectedNames.length + 1, manaratakTableCount: expectedNames.length,
      missingManaratakTableCount: 0, manaratakSchemaProvisioned: true,
    });
    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect([...mocks.query.mock.calls[2][0]].join('').trim()).toBe(
      'SELECT count(*)::integer AS count FROM public."_prisma_migrations"');
    const actual = new URL(mocks.construct.mock.calls[0][0].datasources.db.url);
    expect(actual.hostname).toBe(new URL(env.DATABASE_URL).hostname);
    expect(JSON.stringify(result)).not.toContain('_prisma_migrations');
  });

  it('distinguishes partial MANARATAK tables from unrelated tables', async () => {
    inventory([expectedNames[0], 'unrelated_table']);
    expect(await probePreviewDatabaseSchema(env)).toMatchObject({
      status: 'UP', publicTableCount: 2, manaratakTableCount: 1,
      missingManaratakTableCount: expectedNames.length - 1, manaratakSchemaProvisioned: false,
    });
  });

  it.each([0, 1, 2])('sanitizes schema read failure at query %s without claiming an empty database', async (queryIndex) => {
    const rows = [[{ exists: true }], [{ name: '_prisma_migrations' }]];
    for (let i = 0; i < queryIndex; i++) mocks.query.mockResolvedValueOnce(rows[i]);
    mocks.query.mockRejectedValueOnce(new Error(env.DATABASE_URL));
    const result = await probePreviewDatabaseSchema(env);
    expect(result).toMatchObject({ status: 'DOWN', error: 'DATABASE_CONNECTION_OR_READ_FAILED' });
    expect(result).not.toHaveProperty('publicTableCount');
    expect(JSON.stringify(result)).not.toMatch(/postgres|private-test-password|database\.invalid/);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it.each(probes)('sanitizes errors and emits no console logs', async (probe) => {
    const spies = ['log', 'warn', 'error', 'info', 'debug'].map((method) =>
      vi.spyOn(console, method as 'log').mockImplementation(() => {}));
    try {
      mocks.connect.mockRejectedValue({ code: 'P1000', message: env.DIRECT_URL, meta: env });
      expect(await probe(env)).toMatchObject({ status: 'DOWN', error: 'DATABASE_AUTHENTICATION_FAILED' });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(mocks.construct.mock.calls[0][0].log).toEqual([]);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it.each([
    { ...env, VERCEL_ENV: 'production' }, { ...env, VERCEL_ENV: 'development' },
    { ...env, VERCEL: undefined }, { ...env, MANARATAK_PREVIEW_DATABASE_PROBE: undefined },
    { ...env, MANARATAK_PREVIEW_DATABASE_PROBE: 'false' },
  ])('blocks every probe at HTTP and function boundaries when gates are closed', async (input) => {
    for (const probe of probes) expect(await probe(input)).toMatchObject({ error: 'PREVIEW_DATABASE_PROBE_DISABLED' });
    for (const [key, value] of Object.entries(input)) vi.stubEnv(key, value);
    for (const path of paths) await request(createPreviewAvailabilityApp()).get(path).expect(503);
    expect(mocks.construct).not.toHaveBeenCalled();
  });

  it('serves new routes with 200/503, no cache, and no reads on HEAD/POST', async () => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const app = createPreviewAvailabilityApp();
    await request(app).get(paths[1]).expect(200).expect('Cache-Control', 'no-store');
    inventory([]);
    await request(app).get(paths[2]).expect(200).expect(({ body }) => expect(body.publicTableCount).toBe(0));
    mocks.connect.mockRejectedValue({ code: 'P1001', message: env.DIRECT_URL });
    for (const path of paths) {
      await request(app).get(path).expect(503).expect(({ body }) =>
        expect(body).toMatchObject({ status: 'DOWN', error: 'DATABASE_UNREACHABLE' }));
    }
    mocks.construct.mockClear();
    for (const path of paths) {
      await request(app).head(path).expect(503);
      await request(app).post(path).expect(503);
    }
    expect(mocks.construct).not.toHaveBeenCalled();
  });

  it('AST guard permits only fixed SELECT SQL and read-only Prisma methods in the probe', () => {
    const text = readFileSync(new URL('../src/infrastructure/runtime/PreviewDatabaseProbe.ts', import.meta.url), 'utf8');
    const source = ts.createSourceFile('PreviewDatabaseProbe.ts', text, ts.ScriptTarget.Latest, true);
    const sql: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isPropertyAccessExpression(node) && node.expression.getText(source) === 'client') {
        expect(['$connect', '$disconnect', '$queryRaw']).toContain(node.name.text);
      }
      if (ts.isTaggedTemplateExpression(node)) {
        expect(node.tag.getText(source)).toBe('client.$queryRaw');
        expect(ts.isNoSubstitutionTemplateLiteral(node.template)).toBe(true);
        if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
          const statement = node.template.text.trim();
          expect(statement).toMatch(/^SELECT\s/i);
          expect(statement).not.toMatch(/;|\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|CALL|DO|INTO)\b/i);
          sql.push(statement);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(sql).toHaveLength(4);
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('Preview database probe', () => {
  it.each([
    { ...env, VERCEL_ENV: 'production' },
    { ...env, VERCEL_ENV: 'development' },
    { ...env, VERCEL: undefined },
    { ...env, MANARATAK_PREVIEW_DATABASE_PROBE: undefined },
    { ...env, MANARATAK_PREVIEW_DATABASE_PROBE: 'false' },
    { ...env, MANARATAK_PREVIEW_DATABASE_PROBE: 'TRUE' },
  ])('does not construct Prisma unless both gates are satisfied', async (input) => {
    expect(await probePreviewDatabase(input)).toMatchObject({ error: 'PREVIEW_DATABASE_PROBE_DISABLED' });
    expect(mocks.construct).not.toHaveBeenCalled();
  });
  it('connects using DATABASE_URL, executes only SELECT 1 and disconnects', async () => {
    expect(await probePreviewDatabase(env)).toMatchObject({ status: 'UP' });
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.query).toHaveBeenCalledOnce();
    expect([...mocks.query.mock.calls[0][0]]).toEqual(['SELECT 1']);
    expect(mocks.query.mock.calls[0]).toHaveLength(1);
    const url = new URL(mocks.construct.mock.calls[0][0].datasources.db.url);
    expect(url.hostname).toBe('database.invalid');
    expect(url.password).toBe('private-test-password');
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it.each(['P1000', 'P1001', 'P1002', 'P1011', 'UNKNOWN'])('redacts connection errors (%s)', async (code) => {
    mocks.connect.mockRejectedValue(Object.assign(new Error(env.DATABASE_URL), { code }));
    const result = await probePreviewDatabase(env);
    expect(result.status).toBe('DOWN');
    expect(JSON.stringify(result)).not.toMatch(/private-test-password|database\.invalid|postgresql/);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it('sanitizes query failures and disconnects', async () => {
    mocks.query.mockRejectedValue(new Error(env.DATABASE_URL));
    expect(await probePreviewDatabase(env)).toMatchObject({ status: 'DOWN', error: 'DATABASE_CONNECTION_OR_READ_FAILED' });
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it('classifies Prisma initialization errorCode without exposing its message', async () => {
    mocks.connect.mockRejectedValue({ errorCode: 'P1001', message: env.DATABASE_URL });
    expect(await probePreviewDatabase(env)).toMatchObject({ status: 'DOWN', error: 'DATABASE_UNREACHABLE' });
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it('sanitizes constructor failure and tolerates disconnect failure', async () => {
    mocks.construct.mockImplementationOnce(() => { throw new Error(env.DATABASE_URL); });
    expect(await probePreviewDatabase(env)).toMatchObject({ status: 'DOWN', error: 'DATABASE_CONNECTION_OR_READ_FAILED' });
    expect(mocks.query).not.toHaveBeenCalled();
    mocks.disconnect.mockRejectedValue(new Error(env.DATABASE_URL));
    expect(await probePreviewDatabase(env)).toMatchObject({ status: 'UP' });
  });
  it.each(['', 'not-a-url', 'file:///secret'])('rejects absent/invalid URLs without Prisma', async (DATABASE_URL) => {
    expect((await probePreviewDatabase({ ...env, DATABASE_URL })).status).toBe('DOWN');
    expect(mocks.construct).not.toHaveBeenCalled();
  });
  it('serves HTTP 200/503 and leaves business routes closed', async () => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const app = createPreviewAvailabilityApp();
    await request(app).get('/api/v1/monitoring/health/database').expect(200).expect(({ body }) => expect(body.status).toBe('UP'));
    mocks.connect.mockRejectedValue({ code: 'P1001', message: env.DATABASE_URL });
    await request(app).get('/api/v1/monitoring/health/database').expect(503).expect(({ body }) => expect(body.error).toBe('DATABASE_UNREACHABLE'));
    mocks.construct.mockClear();
    await request(app).post('/api/v1/monitoring/health/database').expect(503);
    await request(app).head('/api/v1/monitoring/health/database').expect(503);
    await request(app).get('/api/v1/admin/users').expect(503);
    await request(app).get('/api/v1/monitoring/health/readiness').expect(503);
    expect(mocks.construct).not.toHaveBeenCalled();
    vi.stubEnv('MANARATAK_PREVIEW_DATABASE_PROBE', 'false');
    await request(app).get('/api/v1/monitoring/health/database').expect(503);
    expect(mocks.construct).not.toHaveBeenCalled();
  });
});
