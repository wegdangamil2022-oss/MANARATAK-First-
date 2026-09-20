import { PrismaClient } from '@prisma/client';

export function assertDisposableDatabaseUrl(databaseUrl: string | undefined = process.env.DATABASE_URL): string {
  if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED_FOR_DATABASE_INTEGRATION');
  const url = new URL(databaseUrl);
  const host = url.hostname.toLowerCase();
  const database = url.pathname.replace(/^\//, '').toLowerCase();
  const isDisposableHost = ['localhost', '127.0.0.1', '::1'].includes(host) || /(?:ci|test|disposable|sandbox)/.test(host);
  const isDisposableDatabase = /(?:ci|test|disposable|sandbox|restore)/.test(database);
  if (!isDisposableHost && !isDisposableDatabase) {
    throw new Error(`DATABASE_INTEGRATION_REQUIRES_DISPOSABLE_TARGET:${host}/${database}`);
  }
  return databaseUrl;
}

export function databaseIntegrationEnabled(): boolean {
  return process.env.MANARATAK_DATABASE_INTEGRATION_ENABLED === 'true' && Boolean(process.env.DATABASE_URL);
}

export async function withDisposablePrisma<T>(run: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  assertDisposableDatabaseUrl();
  const prisma = new PrismaClient();
  await prisma.$connect();
  try { return await run(prisma); }
  finally { await prisma.$disconnect(); }
}
