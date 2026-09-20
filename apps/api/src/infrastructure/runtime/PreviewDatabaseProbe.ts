import type { PreviewProbeClient } from './RuntimeResourceRegistry.js';

type Environment = Readonly<Record<string, string | undefined>>;

export function isPreviewDatabaseProbeEnabled(env: Environment): boolean {
  return env.MANARATAK_RUNTIME_PROFILE !== 'google-ai-studio' && env.MANARATAK_GOOGLE_AI_STUDIO !== 'true'
    && env.VERCEL === '1' && env.VERCEL_ENV === 'preview'
    && env.MANARATAK_PREVIEW_DATABASE_PROBE === 'true';
}

function classify(error: unknown): string {
  const code = typeof error === 'object' && error !== null
    ? ('code' in error ? error.code : 'errorCode' in error ? error.errorCode : undefined)
    : undefined;
  switch (code) {
    case 'P1000': return 'DATABASE_AUTHENTICATION_FAILED';
    case 'P1001': return 'DATABASE_UNREACHABLE';
    case 'P1002': case 'P1008': case 'P2024': return 'DATABASE_TIMEOUT';
    case 'P1011': return 'DATABASE_TLS_ERROR';
    case 'P1013': return 'DATABASE_URL_INVALID';
    case 'P1017': return 'DATABASE_CONNECTION_CLOSED';
    default: return 'DATABASE_CONNECTION_OR_READ_FAILED';
  }
}

/** Isolated client, no application DI, no logging of connection/query errors. */
async function withPreviewDatabase<T extends object>(
  env: Environment,
  source: 'DATABASE_URL' | 'DIRECT_URL',
  read: (client: PreviewProbeClient) => Promise<T>,
) {
  if (!isPreviewDatabaseProbeEnabled(env)) {
    return { status: 'DOWN' as const, error: 'PREVIEW_DATABASE_PROBE_DISABLED' };
  }
  const connection = env[source];
  if (!connection?.trim()) return { status: 'DOWN' as const, error: `${source}_MISSING` };
  let url: URL;
  try {
    url = new URL(connection);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
  } catch {
    return { status: 'DOWN' as const, error: `${source}_INVALID` };
  }
  // Bound this isolated probe's connection/query wait without changing stored secrets.
  url.searchParams.set('connect_timeout', '5');
  url.searchParams.set('socket_timeout', '5');
  url.searchParams.set('pool_timeout', '5');
  url.searchParams.set('connection_limit', '1');
  const started = Date.now();
  let client: PreviewProbeClient | undefined;
  try {
    // Prisma 5.22 runtime queries use the datasource url override (not directUrl).
    const { createPreviewProbeClient } = await import('./RuntimeResourceRegistry.js');
    client = createPreviewProbeClient(url.toString());
    await client.$connect();
    const details = await read(client);
    return { ...details, status: 'UP' as const, latencyMs: Date.now() - started };
  } catch (error: unknown) {
    return { status: 'DOWN' as const, error: classify(error), latencyMs: Date.now() - started };
  } finally {
    try { await client?.$disconnect(); } catch { /* Never expose connection details. */ }
  }
}

async function selectOne(client: PreviewProbeClient) {
  await client.$queryRaw`SELECT 1`;
  return {};
}

export function probePreviewDatabase(env: Environment = process.env) {
  return withPreviewDatabase(env, 'DATABASE_URL', selectOne);
}

export function probePreviewDirectDatabase(env: Environment = process.env) {
  return withPreviewDatabase(env, 'DIRECT_URL', selectOne);
}

/** Catalog/table-presence inventory only: not a columns/constraints or migration-status audit. */
export function probePreviewDatabaseSchema(env: Environment = process.env) {
  return withPreviewDatabase(env, 'DATABASE_URL', async (client) => {
    const [schema] = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'public'
      ) AS "exists"`;
    const tables = await client.$queryRaw<Array<{ name: string }>>`
      SELECT c.relname AS name
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`;
    const names = new Set(tables.map((table) => table.name));
    const prismaMigrationsTableExists = names.has('_prisma_migrations');
    let migrationCount = 0;
    if (prismaMigrationsTableExists) {
      const [count] = await client.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::integer AS count FROM public."_prisma_migrations"`;
      migrationCount = count.count;
    }
    // Generated Prisma metadata respects @@map; never return internal table names.
    const { previewProbeModelNames } = await import('./RuntimeResourceRegistry.js');
    const expected = previewProbeModelNames();
    const manaratakTableCount = expected.filter((name) => names.has(name)).length;
    return {
      publicSchemaExists: schema.exists,
      prismaMigrationsTableExists,
      migrationCount,
      publicTableCount: names.size,
      manaratakTableCount,
      expectedManaratakTableCount: expected.length,
      missingManaratakTableCount: expected.length - manaratakTableCount,
      manaratakSchemaProvisioned: expected.length > 0 && manaratakTableCount === expected.length,
    };
  });
}
